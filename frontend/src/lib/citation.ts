// ============================================================================
// Eien-no-Kiroku — Citation formatting engine
// Feature parity with ZoteroBib, MyBib, EasyBib, Citation Machine & BibMe:
// multi-style formatted citations, in-text citations, and export formats.
// ============================================================================

export type SourceType = 'journal' | 'book' | 'webpage' | 'report' | 'thesis';

export interface Citation {
  id: string;
  type: SourceType;
  title: string;
  authors: string[];
  year?: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  edition?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  accessDate?: string;
  source: string;
}

export type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver' | 'ieee' | 'bibtex';

export const STYLES: { id: CitationStyle; name: string }[] = [
  { id: 'apa', name: 'APA 7' },
  { id: 'mla', name: 'MLA 9' },
  { id: 'chicago', name: 'Chicago' },
  { id: 'harvard', name: 'Harvard' },
  { id: 'vancouver', name: 'Vancouver' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'bibtex', name: 'BibTeX' },
];

export const SOURCE_TYPES: { id: SourceType; name: string }[] = [
  { id: 'journal', name: 'Journal Article' },
  { id: 'book', name: 'Book' },
  { id: 'webpage', name: 'Website' },
  { id: 'report', name: 'Report' },
  { id: 'thesis', name: 'Thesis' },
];

// ---------------------------------------------------------------------------
// Author name helpers — accept "Given Family" or "Family, Given"
// ---------------------------------------------------------------------------

export function splitName(name: string): { family: string; given: string } {
  const trimmed = name.trim();
  if (!trimmed) return { family: '', given: '' };
  if (trimmed.includes(',')) {
    const idx = trimmed.indexOf(',');
    return { family: trimmed.slice(0, idx).trim(), given: trimmed.slice(idx + 1).trim() };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { family: parts[0], given: '' };
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') };
}

function initials(given: string): string {
  return given
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + '.')
    .join(' ');
}

function family(given: string): string {
  return splitName(given).family;
}

/** "Smith, J. A., & Doe, J." style used by APA/Harvard */
function authorsAPA(authors: string[]): string {
  const names = authors.map((a) => {
    const { family: fam, given } = splitName(a);
    return given ? `${fam}, ${initials(given)}` : fam;
  });
  if (names.length === 0) return 'Unknown Author';
  if (names.length === 1) return names[0];
  if (names.length <= 20) {
    return `${names.slice(0, -1).join(', ')}, & ${names[names.length - 1]}`;
  }
  return `${names.slice(0, 19).join(', ')}, ... ${names[names.length - 1]}`;
}

/** Join remaining authors: "Head, A, B, and C" (comma before final "and") */
function joinRest(rest: string[]): string {
  if (rest.length === 0) return '';
  if (rest.length === 1) return `, and ${rest[0]}`;
  return `, ${rest.slice(0, -1).join(', ')}, and ${rest[rest.length - 1]}`;
}

/** "Smith, John, and Jane Doe." — MLA (first inverted only, "and" before last) */
function authorsMLA(authors: string[]): string {
  if (authors.length === 0) return 'Unknown Author';
  if (authors.length >= 3) return `${splitName(authors[0]).family}, ${splitName(authors[0]).given}, et al`;
  const first = splitName(authors[0]);
  const head = first.given ? `${first.family}, ${first.given}` : first.family;
  const rest = authors.slice(1).map((a) => {
    const n = splitName(a);
    return n.given ? `${n.given} ${n.family}` : n.family;
  });
  return head + joinRest(rest);
}

/** Chicago: like MLA but et al. at 10+ */
function authorsChicago(authors: string[]): string {
  if (authors.length === 0) return 'Unknown Author';
  if (authors.length >= 10) return `${splitName(authors[0]).family}, ${splitName(authors[0]).given}, et al`;
  return authorsMLA(authors);
}

/** Vancouver: "Smith J, Doe A" — max 6 then et al. */
function authorsVancouver(authors: string[]): string {
  if (authors.length === 0) return 'Unknown Author';
  const names = authors.map((a) => {
    const { family: fam, given } = splitName(a);
    return given ? `${fam} ${initials(given).replace(/\./g, '')}` : fam;
  });
  if (names.length > 6) return `${names.slice(0, 6).join(', ')}, et al`;
  return names.join(', ');
}

/** IEEE: "J. Smith and A. Doe" — max 6 then et al. */
function authorsIEEE(authors: string[]): string {
  if (authors.length === 0) return 'Unknown Author';
  const names = authors.map((a) => {
    const { family: fam, given } = splitName(a);
    return given ? `${initials(given)} ${fam}` : fam;
  });
  if (names.length > 6) return `${names.slice(0, 6).join(', ')}, et al.`;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Style-aware formatted citations (HTML output — <i> marks italics per style)
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function doiLink(c: Citation): string {
  if (c.doi) return ` https://doi.org/${c.doi.replace(/^https?:\/\/doi\.org\//, '')}`;
  return '';
}

function todayLong(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function accessLabel(c: Citation): string {
  if (c.accessDate) {
    const d = new Date(c.accessDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return todayLong();
}

export function formatCitation(c: Citation, style: CitationStyle): string {
  if (style === 'bibtex') return esc(generateBibTeX(c));
  const t = esc(c.title);
  const year = c.year || 'n.d.';

  switch (style) {
    case 'apa': {
      const authors = authorsAPA(c.authors);
      if (c.type === 'journal') {
        const journal = c.journal ? `<i>${esc(c.journal)}</i>` : '';
        const vol = c.volume ? `, <i>${esc(c.volume)}</i>` : '';
        const issue = c.issue ? `(${esc(c.issue)})` : '';
        const pages = c.pages ? `, ${esc(c.pages)}` : '';
        return `${esc(authors)} (${year}). ${t}. ${journal}${vol}${issue}${pages}.${doiLink(c)}`;
      }
      if (c.type === 'book') {
        const ed = c.edition ? ` (${esc(c.edition)} ed.)` : '';
        return `${esc(authors)} (${year}). <i>${t}</i>${ed}. ${esc(c.publisher || 'Unknown Publisher')}.${doiLink(c)}`;
      }
      if (c.type === 'thesis') {
        return `${esc(authors)} (${year}). <i>${t}</i> [Doctoral dissertation, ${esc(c.publisher || 'Unknown Institution')}]${doiLink(c)}`;
      }
      if (c.type === 'report') {
        return `${esc(authors)} (${year}). <i>${t}</i>. ${esc(c.publisher || 'Unknown Organization')}.${doiLink(c)}`;
      }
      const site = c.publisher ? ` ${esc(c.publisher)}.` : '';
      return `${esc(authors)} (${year}). <i>${t}</i>.${site} ${esc(c.url || doiLink(c).trim() || '')}`.trim() + (c.url ? '' : '');
    }
    case 'mla': {
      const authors = authorsMLA(c.authors);
      if (c.type === 'journal') {
        const journal = c.journal ? `<i>${esc(c.journal)}</i>` : '';
        const vol = c.volume ? `, vol. ${esc(c.volume)}` : '';
        const issue = c.issue ? `, no. ${esc(c.issue)}` : '';
        const pages = c.pages ? `, pp. ${esc(c.pages)}` : '';
        return `${esc(authors)}. &ldquo;${t}.&rdquo; ${journal}${vol}${issue}, ${year}${pages}.${c.url ? ` ${esc(c.url)}.` : ''}`;
      }
      if (c.type === 'book') {
        const ed = c.edition ? ` ${esc(c.edition)} ed.,` : '';
        return `${esc(authors)}. <i>${t}</i>.${ed} ${esc(c.publisher || 'Unknown Publisher')}, ${year}.${c.url ? ` ${esc(c.url)}.` : ''}`;
      }
      const site = c.publisher ? `<i>${esc(c.publisher)}</i>, ` : '';
      return `${esc(authors)}. &ldquo;${t}.&rdquo; ${site}${year}, ${esc(c.url || '')}. Accessed ${accessLabel(c)}.`;
    }
    case 'chicago': {
      const authors = authorsChicago(c.authors);
      if (c.type === 'journal') {
        const journal = c.journal ? `<i>${esc(c.journal)}</i>` : '';
        const vol = c.volume ? ` ${esc(c.volume)}` : '';
        const issue = c.issue ? `, no. ${esc(c.issue)}` : '';
        const pages = c.pages ? `: ${esc(c.pages)}` : '';
        return `${esc(authors)}. ${year}. &ldquo;${t}.&rdquo; ${journal}${vol}${issue}${pages}.${doiLink(c)}`;
      }
      if (c.type === 'book') {
        return `${esc(authors)}. ${year}. <i>${t}</i>. ${esc(c.publisher || 'Unknown Publisher')}.`;
      }
      const site = c.publisher ? ` ${esc(c.publisher)}.` : '';
      return `${esc(authors)}. ${year}. &ldquo;${t}.&rdquo;${site} ${esc(c.url || '')}`.trim();
    }
    case 'harvard': {
      const authors = authorsAPA(c.authors);
      if (c.type === 'journal') {
        const journal = c.journal ? `<i>${esc(c.journal)}</i>` : '';
        const vol = c.volume ? `, ${esc(c.volume)}` : '';
        const issue = c.issue ? `(${esc(c.issue)})` : '';
        const pages = c.pages ? `, pp. ${esc(c.pages)}` : '';
        return `${esc(authors)} (${year}) &lsquo;${t}&rsquo;, ${journal}${vol}${issue}${pages}.${doiLink(c)}`;
      }
      if (c.type === 'book') {
        return `${esc(authors)} (${year}) <i>${t}</i>. ${esc(c.publisher || 'Unknown Publisher')}.`;
      }
      return `${esc(authors)} (${year}) &lsquo;${t}&rsquo;. Available at: ${esc(c.url || '')} (Accessed: ${accessLabel(c)}).`;
    }
    case 'vancouver': {
      const authors = authorsVancouver(c.authors);
      if (c.type === 'journal') {
        const journal = c.journal ? `${esc(c.journal)}` : '';
        const vol = c.volume ? `${esc(c.volume)}` : '';
        const issue = c.issue ? `(${esc(c.issue)})` : '';
        const pages = c.pages ? `:${esc(c.pages)}` : '';
        return `${esc(authors)}.${journal ? ` ${journal}` : ''}. ${year};${vol}${issue}${pages}.${doiLink(c)}`;
      }
      if (c.type === 'book') {
        return `${esc(authors)}. ${t}. ${esc(c.publisher || 'Unknown Publisher')}; ${year}.`;
      }
      return `${esc(authors)}. ${t} [Internet]. ${year} [cited ${accessLabel(c)}]. Available from: ${esc(c.url || '')}`;
    }
    case 'ieee':
    default: {
      const authors = authorsIEEE(c.authors);
      if (c.type === 'journal') {
        const journal = c.journal ? `<i>${esc(c.journal)}</i>` : '';
        const vol = c.volume ? `, vol. ${esc(c.volume)}` : '';
        const issue = c.issue ? `, no. ${esc(c.issue)}` : '';
        const pages = c.pages ? `, pp. ${esc(c.pages)}` : '';
        return `${esc(authors)}, &ldquo;${t},&rdquo; ${journal}${vol}${issue}${pages}, ${year}.${doiLink(c)}`;
      }
      if (c.type === 'book') {
        return `${esc(authors)}, <i>${t}</i>. ${esc(c.publisher || 'Unknown Publisher')}, ${year}.`;
      }
      return `${esc(authors)}, &ldquo;${t},&rdquo; ${esc(c.publisher || 'Online')}, ${year}. [Online]. Available: ${esc(c.url || '')}`;
    }
  }
}

// ---------------------------------------------------------------------------
// In-text citations (parenthetical & narrative) — MyBib / EasyBib feature
// ---------------------------------------------------------------------------

export function inTextParenthetical(c: Citation, style: CitationStyle, index: number): string {
  const a = family(c.authors[0] || 'Unknown');
  const year = c.year || 'n.d.';
  switch (style) {
    case 'mla':
      return `(${a})`;
    case 'vancouver':
      return `(${index})`;
    case 'ieee':
      return `[${index}]`;
    case 'apa':
    case 'chicago':
    case 'harvard':
    default:
      return `(${a}, ${year})`;
  }
}

export function inTextNarrative(c: Citation, style: CitationStyle, index: number): string {
  const a = family(c.authors[0] || 'Unknown');
  const year = c.year || 'n.d.';
  switch (style) {
    case 'mla':
      return a;
    case 'vancouver':
      return `${a} [${index}]`;
    case 'ieee':
      return `${a} [${index}]`;
    case 'apa':
    case 'chicago':
    case 'harvard':
    default:
      return `${a} (${year})`;
  }
}

// ---------------------------------------------------------------------------
// Structured exporters — BibTeX, RIS, CSV, plain text (ZoteroBib parity)
// ---------------------------------------------------------------------------

export function generateBibTeX(c: Citation): string {
  const authorFormat = c.authors.join(' and ');
  const firstWord = (c.title.split(' ')[0] || 'Ref').replace(/[^a-zA-Z]/g, '');
  const key = (firstWord || 'Ref') + (c.year || 'ND');

  let type = 'misc';
  if (c.type === 'journal') type = 'article';
  else if (c.type === 'book') type = 'book';
  else if (c.type === 'thesis') type = 'phdthesis';
  else if (c.type === 'report') type = 'techreport';
  else if (c.type === 'webpage') type = 'online';

  const fields: string[] = [`  title = {${c.title}}`];
  if (c.authors.length) fields.push(`  author = {${authorFormat}}`);
  if (c.year) fields.push(`  year = {${c.year}}`);
  if (c.publisher) fields.push(`  publisher = {${c.publisher}}`);
  if (c.journal) fields.push(`  journal = {${c.journal}}`);
  if (c.volume) fields.push(`  volume = {${c.volume}}`);
  if (c.issue) fields.push(`  number = {${c.issue}}`);
  if (c.pages) fields.push(`  pages = {${c.pages}}`);
  if (c.edition) fields.push(`  edition = {${c.edition}}`);
  if (c.doi) fields.push(`  doi = {${c.doi}}`);
  if (c.isbn) fields.push(`  isbn = {${c.isbn}}`);
  if (c.url) fields.push(`  url = {${c.url}}`);

  return `@${type}{${key},\n${fields.join(',\n')}\n}`;
}

export function generateRIS(c: Citation): string {
  const ty = c.type === 'journal' ? 'JOUR' : c.type === 'book' ? 'BOOK' : c.type === 'thesis' ? 'THES' : c.type === 'report' ? 'RPRT' : 'ELEC';
  const lines = [`TY  - ${ty}`];
  c.authors.forEach((a) => {
    const n = splitName(a);
    lines.push(`AU  - ${n.family}${n.given ? `, ${n.given}` : ''}`);
  });
  lines.push(`TI  - ${c.title}`);
  if (c.year) lines.push(`PY  - ${c.year}`);
  if (c.journal) lines.push(`JO  - ${c.journal}`);
  if (c.volume) lines.push(`VL  - ${c.volume}`);
  if (c.issue) lines.push(`IS  - ${c.issue}`);
  if (c.pages) lines.push(`SP  - ${c.pages}`);
  if (c.publisher) lines.push(`PB  - ${c.publisher}`);
  if (c.isbn) lines.push(`SN  - ${c.isbn}`);
  if (c.doi) lines.push(`DO  - ${c.doi}`);
  if (c.url) lines.push(`UR  - ${c.url}`);
  if (c.accessDate) lines.push(`Y2  - ${c.accessDate}`);
  lines.push('ER  - ');
  return lines.join('\n');
}

export function generateCSV(citations: Citation[]): string {
  const header = ['Type', 'Authors', 'Title', 'Year', 'Publisher', 'Journal', 'Volume', 'Issue', 'Pages', 'Edition', 'DOI', 'ISBN', 'URL', 'Accessed', 'DetectedVia'];
  const rows = citations.map((c) =>
    [c.type, c.authors.join('; '), c.title, c.year || '', c.publisher || '', c.journal || '', c.volume || '', c.issue || '', c.pages || '', c.edition || '', c.doi || '', c.isbn || '', c.url || '', c.accessDate || '', c.source]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

export function htmlToPlain(html: string): string {
  return html
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();
}

/** Full formatted bibliography (HTML with hanging indent handled by CSS) */
export function formatBibliography(citations: Citation[], style: CitationStyle): string {
  return citations.map((c) => `<div class="bib-entry">${formatCitation(c, style)}</div>`).join('\n');
}

// ---------------------------------------------------------------------------
// Manual entry defaults & missing-field guidance (EasyBib parity)
// ---------------------------------------------------------------------------

export function blankCitation(type: SourceType = 'webpage'): Citation {
  return {
    id: crypto.randomUUID(),
    type,
    title: '',
    authors: [],
    source: 'Manual Entry',
  };
}

export function missingFieldWarnings(c: Citation, style: CitationStyle): string[] {
  const warnings: string[] = [];
  if (!c.title.trim()) warnings.push('A title is required for every source type.');
  if (!c.authors.length) warnings.push('No authors detected — ' + (style === 'mla' ? 'MLA allows citing by title instead.' : 'the style guide recommends author names; verify the source.'));
  if (!c.year && style !== 'mla') warnings.push('No publication year — output will use "n.d."');
  if (c.type === 'journal' && !c.journal) warnings.push('Journal name is missing for this article.');
  if (c.type === 'book' && !c.publisher) warnings.push('Publisher is missing for this book.');
  if (c.type === 'webpage' && !c.url) warnings.push('A URL is required to cite a webpage.');
  return warnings;
}
