// ============================================================================
// Eien-no-Kiroku — Citation formatting engine
// Feature parity with ZoteroBib, MyBib, EasyBib, BibGuru, Cite This For Me:
// multi-style formatted citations, in-text citations with page locators,
// footnotes (Copy Note), and export formats.
// ============================================================================

export type SourceType = 'journal' | 'book' | 'chapter' | 'webpage' | 'report' | 'thesis' | 'newspaper' | 'video' | 'conference';

export interface Citation {
  id: string;
  type: SourceType;
  title: string;
  authors: string[];
  year?: string;
  publisher?: string;
  journal?: string; // container: journal name / book title / proceedings / newspaper
  volume?: string;
  issue?: string;
  pages?: string;
  edition?: string;
  url?: string;
  doi?: string;
  isbn?: string;
  accessDate?: string;
  notes?: string;
  tags?: string[];
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
  { id: 'chapter', name: 'Book Chapter' },
  { id: 'webpage', name: 'Website' },
  { id: 'newspaper', name: 'Newspaper/Magazine' },
  { id: 'conference', name: 'Conference Paper' },
  { id: 'report', name: 'Report' },
  { id: 'thesis', name: 'Thesis' },
  { id: 'video', name: 'Video' },
];

/** Container field label per source type (EasyBib "59+ source types" parity) */
export function containerLabel(type: SourceType): string {
  switch (type) {
    case 'chapter': return 'Book Title';
    case 'newspaper': return 'Newspaper/Magazine';
    case 'conference': return 'Proceedings';
    case 'video': return 'Channel/Series';
    default: return 'Journal';
  }
}

/** Styles that alphabetize the bibliography vs. numbered (citation-order) styles */
export function isAlphaStyle(style: CitationStyle): boolean {
  return style === 'apa' || style === 'mla' || style === 'chicago' || style === 'harvard';
}

/** Default bibliography order for a style (BibGuru auto-alphabetizing parity) */
export function autoOrder(citations: Citation[], style: CitationStyle): Citation[] {
  if (!isAlphaStyle(style)) return citations;
  return [...citations].sort((a, b) => {
    const fa = family(a.authors[0] || a.title).toLowerCase();
    const fb = family(b.authors[0] || b.title).toLowerCase();
    return fa.localeCompare(fb) || (a.year || '').localeCompare(b.year || '');
  });
}

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

/** "pp. 45" or "p. 45" depending on range (APA/Harvard) */
function pageLabel(pages: string): string {
  return /[-–,]/.test(pages) ? `pp. ${pages}` : `p. ${pages}`;
}

export function formatCitation(c: Citation, style: CitationStyle): string {
  if (style === 'bibtex') return esc(generateBibTeX(c));
  const t = esc(c.title);
  const year = c.year || 'n.d.';
  const container = c.journal;
  const isContainerType =
    c.type === 'journal' || c.type === 'newspaper' || c.type === 'conference';

  switch (style) {
    case 'apa': {
      const authors = authorsAPA(c.authors);
      if (isContainerType) {
        const j = container ? `<i>${esc(container)}</i>` : '';
        const vol = c.volume ? `, <i>${esc(c.volume)}</i>` : '';
        const issue = c.issue ? `(${esc(c.issue)})` : '';
        const pages = c.pages ? `, ${esc(c.pages)}` : '';
        return `${esc(authors)} (${year}). ${t}. ${j}${vol}${issue}${pages}.${doiLink(c)}`;
      }
      if (c.type === 'chapter') {
        const ed = c.edition ? ` (${esc(c.edition)} ed.)` : '';
        const pg = c.pages ? ` (pp. ${esc(c.pages)})` : '';
        return `${esc(authors)} (${year}). ${t}. In ${container ? `<i>${esc(container)}</i>` : 'Untitled Book'}${pg}${ed}. ${esc(c.publisher || 'Unknown Publisher')}.${doiLink(c)}`;
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
      if (c.type === 'video') {
        return `${esc(authors)} (${year}). <i>${t}</i> [Video]. ${esc(c.publisher || container || 'Online')}. ${esc(c.url || '')}`.trim();
      }
      const site = c.publisher ? ` ${esc(c.publisher)}.` : '';
      return `${esc(authors)} (${year}). <i>${t}</i>.${site} ${esc(c.url || doiLink(c).trim() || '')}`.trim();
    }
    case 'mla': {
      const authors = authorsMLA(c.authors);
      if (isContainerType) {
        const j = container ? `<i>${esc(container)}</i>` : '';
        const vol = c.volume ? `, vol. ${esc(c.volume)}` : '';
        const issue = c.issue ? `, no. ${esc(c.issue)}` : '';
        const pages = c.pages ? `, pp. ${esc(c.pages)}` : '';
        return `${esc(authors)}. &ldquo;${t}.&rdquo; ${j}${vol}${issue}, ${year}${pages}.${c.url ? ` ${esc(c.url)}.` : ''}`;
      }
      if (c.type === 'chapter') {
        const ed = c.edition ? ` ${esc(c.edition)} ed.` : '';
        const pg = c.pages ? `, pp. ${esc(c.pages)}` : '';
        return `${esc(authors)}. &ldquo;${t}.&rdquo; <i>${esc(container || 'Untitled Book')}</i>${ed}, ${esc(c.publisher || 'Unknown Publisher')}, ${year}${pg}.${c.url ? ` ${esc(c.url)}.` : ''}`;
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
      if (isContainerType) {
        const j = container ? `<i>${esc(container)}</i>` : '';
        const vol = c.volume ? ` ${esc(c.volume)}` : '';
        const issue = c.issue ? `, no. ${esc(c.issue)}` : '';
        const pages = c.pages ? `: ${esc(c.pages)}` : '';
        return `${esc(authors)}. ${year}. &ldquo;${t}.&rdquo; ${j}${vol}${issue}${pages}.${doiLink(c)}`;
      }
      if (c.type === 'chapter') {
        const pg = c.pages ? `, ${esc(c.pages)}` : '';
        return `${esc(authors)}. ${year}. &ldquo;${t}.&rdquo; In <i>${esc(container || 'Untitled Book')}</i>${pg}. ${esc(c.publisher || 'Unknown Publisher')}.`;
      }
      if (c.type === 'book') {
        return `${esc(authors)}. ${year}. <i>${t}</i>. ${esc(c.publisher || 'Unknown Publisher')}.`;
      }
      const site = c.publisher ? ` ${esc(c.publisher)}.` : '';
      return `${esc(authors)}. ${year}. &ldquo;${t}.&rdquo;${site} ${esc(c.url || '')}`.trim();
    }
    case 'harvard': {
      const authors = authorsAPA(c.authors);
      if (isContainerType) {
        const j = container ? `<i>${esc(container)}</i>` : '';
        const vol = c.volume ? `, ${esc(c.volume)}` : '';
        const issue = c.issue ? `(${esc(c.issue)})` : '';
        const pages = c.pages ? `, pp. ${esc(c.pages)}` : '';
        return `${esc(authors)} (${year}) &lsquo;${t}&rsquo;, ${j}${vol}${issue}${pages}.${doiLink(c)}`;
      }
      if (c.type === 'chapter') {
        const pg = c.pages ? ` pp. ${esc(c.pages)}.` : '';
        return `${esc(authors)} (${year}) &lsquo;${t}&rsquo;, in ${container ? `<i>${esc(container)}</i>` : 'Untitled Book'}. ${esc(c.publisher || 'Unknown Publisher')}.${pg}${doiLink(c)}`;
      }
      if (c.type === 'book') {
        return `${esc(authors)} (${year}) <i>${t}</i>. ${esc(c.publisher || 'Unknown Publisher')}.`;
      }
      return `${esc(authors)} (${year}) &lsquo;${t}&rsquo;. Available at: ${esc(c.url || '')} (Accessed: ${accessLabel(c)}).`;
    }
    case 'vancouver': {
      const authors = authorsVancouver(c.authors);
      if (isContainerType) {
        const j = container ? `${esc(container)}` : '';
        const vol = c.volume ? `${esc(c.volume)}` : '';
        const issue = c.issue ? `(${esc(c.issue)})` : '';
        const pages = c.pages ? `:${esc(c.pages)}` : '';
        return `${esc(authors)}.${j ? ` ${j}` : ''}. ${year};${vol}${issue}${pages}.${doiLink(c)}`;
      }
      if (c.type === 'chapter') {
        const pg = c.pages ? ` p. ${esc(c.pages)}.` : '';
        return `${esc(authors)}. ${t}. In: ${esc(container || 'Untitled Book')}. ${esc(c.publisher || 'Unknown Publisher')}; ${year}.${pg}${doiLink(c)}`;
      }
      if (c.type === 'book') {
        return `${esc(authors)}. ${t}. ${esc(c.publisher || 'Unknown Publisher')}; ${year}.`;
      }
      return `${esc(authors)}. ${t} [Internet]. ${year} [cited ${accessLabel(c)}]. Available from: ${esc(c.url || '')}`;
    }
    case 'ieee':
    default: {
      const authors = authorsIEEE(c.authors);
      if (isContainerType) {
        const j = container ? `<i>${esc(container)}</i>` : '';
        const vol = c.volume ? `, vol. ${esc(c.volume)}` : '';
        const issue = c.issue ? `, no. ${esc(c.issue)}` : '';
        const pages = c.pages ? `, pp. ${esc(c.pages)}` : '';
        return `${esc(authors)}, &ldquo;${t},&rdquo; ${j}${vol}${issue}${pages}, ${year}.${doiLink(c)}`;
      }
      if (c.type === 'chapter') {
        const pg = c.pages ? `, pp. ${esc(c.pages)}` : '';
        return `${esc(authors)}, &ldquo;${t},&rdquo; in <i>${esc(container || 'Untitled Book')}</i>, ${esc(c.publisher || 'Unknown Publisher')}, ${year}${pg}.${doiLink(c)}`;
      }
      if (c.type === 'book') {
        return `${esc(authors)}, <i>${t}</i>. ${esc(c.publisher || 'Unknown Publisher')}, ${year}.`;
      }
      return `${esc(authors)}, &ldquo;${t},&rdquo; ${esc(c.publisher || 'Online')}, ${year}. [Online]. Available: ${esc(c.url || '')}`;
    }
  }
}

// ---------------------------------------------------------------------------
// In-text citations with optional page/section locator (ZoteroBib parity)
// ---------------------------------------------------------------------------

export function inTextParenthetical(c: Citation, style: CitationStyle, index: number, locator = ''): string {
  const a = family(c.authors[0] || 'Unknown');
  const year = c.year || 'n.d.';
  const loc = locator.trim();
  switch (style) {
    case 'mla':
      return loc ? `(${a} ${loc})` : `(${a})`;
    case 'vancouver':
      return `(${index})`;
    case 'ieee':
      return `[${index}]`;
    case 'harvard':
      return loc ? `(${a}, ${year}, ${pageLabel(loc)})` : `(${a}, ${year})`;
    case 'apa':
    case 'chicago':
    default:
      return loc ? `(${a}, ${year}, ${pageLabel(loc)})` : `(${a}, ${year})`;
  }
}

export function inTextNarrative(c: Citation, style: CitationStyle, index: number, locator = ''): string {
  const a = family(c.authors[0] || 'Unknown');
  const year = c.year || 'n.d.';
  const loc = locator.trim();
  switch (style) {
    case 'mla':
      return loc ? `${a} (${loc})` : a;
    case 'vancouver':
      return `${a} [${index}]`;
    case 'ieee':
      return `${a} [${index}]`;
    case 'apa':
    case 'chicago':
    case 'harvard':
    default:
      return loc ? `${a} (${year}, ${pageLabel(loc)})` : `${a} (${year})`;
  }
}

/** Footnote / endnote — Chicago notes-bibliography style (ZoteroBib "Copy Note") */
export function formatFootnote(c: Citation, locator = ''): string {
  const authors = authorsMLA(c.authors);
  const loc = locator.trim();
  const pg = loc ? `, ${/[-–,]/.test(loc) ? 'pp.' : 'p.'} ${loc}` : '';
  const t = c.title;

  if (c.type === 'book') {
    return `${authors}, <i>${esc(t)}</i>${c.edition ? ` (${esc(c.edition)} ed.)` : ''} (${esc(c.publisher || 'Unknown Publisher')}, ${c.year || 'n.d.'})${pg}.`;
  }
  if (c.type === 'chapter') {
    return `${authors}, &ldquo;${esc(t)},&rdquo; in <i>${esc(c.journal || 'Untitled Book')}</i>${c.pages && !loc ? `, p. ${esc(c.pages)}` : ''} (${esc(c.publisher || 'Unknown Publisher')}, ${c.year || 'n.d.'})${pg}.`;
  }
  if (c.type === 'journal' || c.type === 'newspaper' || c.type === 'conference') {
    const j = c.journal ? `<i>${esc(c.journal)}</i>` : '';
    const vol = c.volume ? ` ${esc(c.volume)}` : '';
    const issue = c.issue ? `, no. ${esc(c.issue)}` : '';
    return `${authors}, &ldquo;${esc(t)},&rdquo; ${j}${vol}${issue} (${c.year || 'n.d.'})${pg || (c.pages ? `, ${esc(c.pages)}` : '')}.${doiLink(c)}`;
  }
  return `${authors}, &ldquo;${esc(t)},&rdquo; ${esc(c.publisher || '')}${c.publisher ? ', ' : ''}${c.year || 'n.d.'}, ${esc(c.url || '')}${pg}.`;
}

// ---------------------------------------------------------------------------
// Structured exporters — BibTeX, RIS, CSV, plain text (ZoteroBib parity)
// ---------------------------------------------------------------------------

export function generateBibTeX(c: Citation): string {
  const authorFormat = c.authors.join(' and ');
  const firstWord = (c.title.split(' ')[0] || 'Ref').replace(/[^a-zA-Z]/g, '');
  const key = (firstWord || 'Ref') + (c.year || 'ND');

  let type = 'misc';
  if (c.type === 'journal' || c.type === 'newspaper' || c.type === 'conference') type = 'article';
  else if (c.type === 'book') type = 'book';
  else if (c.type === 'chapter') type = 'incollection';
  else if (c.type === 'thesis') type = 'phdthesis';
  else if (c.type === 'report') type = 'techreport';
  else if (c.type === 'webpage' || c.type === 'video') type = 'online';

  const fields: string[] = [`  title = {${c.title}}`];
  if (c.authors.length) fields.push(`  author = {${authorFormat}}`);
  if (c.year) fields.push(`  year = {${c.year}}`);
  if (c.publisher) fields.push(`  publisher = {${c.publisher}}`);
  if (c.journal) fields.push(`${c.type === 'chapter' ? '  booktitle' : '  journal'} = {${c.journal}}`);
  if (c.volume) fields.push(`  volume = {${c.volume}}`);
  if (c.issue) fields.push(`  number = {${c.issue}}`);
  if (c.pages) fields.push(`  pages = {${c.pages}}`);
  if (c.edition) fields.push(`  edition = {${c.edition}}`);
  if (c.doi) fields.push(`  doi = {${c.doi}}`);
  if (c.isbn) fields.push(`  isbn = {${c.isbn}}`);
  if (c.url) fields.push(`  url = {${c.url}}`);
  if (c.notes) fields.push(`  note = {${c.notes}}`);
  if (c.tags?.length) fields.push(`  keywords = {${c.tags.join(', ')}}`);

  return `@${type}{${key},\n${fields.join(',\n')}\n}`;
}

export function generateRIS(c: Citation): string {
  const ty =
    c.type === 'journal' || c.type === 'conference' ? 'JOUR'
    : c.type === 'book' ? 'BOOK'
    : c.type === 'chapter' ? 'CHAP'
    : c.type === 'thesis' ? 'THES'
    : c.type === 'report' ? 'RPRT'
    : c.type === 'newspaper' ? 'NEWS'
    : 'ELEC';
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
  if (c.edition) lines.push(`ET  - ${c.edition}`);
  if (c.isbn) lines.push(`SN  - ${c.isbn}`);
  if (c.doi) lines.push(`DO  - ${c.doi}`);
  if (c.url) lines.push(`UR  - ${c.url}`);
  if (c.accessDate) lines.push(`Y2  - ${c.accessDate}`);
  if (c.notes) lines.push(`N1  - ${c.notes}`);
  (c.tags || []).forEach((t) => lines.push(`KW  - ${t}`));
  lines.push('ER  - ');
  return lines.join('\n');
}

export function generateCSV(citations: Citation[]): string {
  const header = ['Type', 'Authors', 'Title', 'Year', 'Publisher', 'Container', 'Volume', 'Issue', 'Pages', 'Edition', 'DOI', 'ISBN', 'URL', 'Accessed', 'Tags', 'Notes', 'DetectedVia'];
  const rows = citations.map((c) =>
    [c.type, c.authors.join('; '), c.title, c.year || '', c.publisher || '', c.journal || '', c.volume || '', c.issue || '', c.pages || '', c.edition || '', c.doi || '', c.isbn || '', c.url || '', c.accessDate || '', (c.tags || []).join('; '), c.notes || '', c.source]
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
// Manual entry defaults & missing-field guidance (EasyBib/BibGuru parity)
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
  if ((c.type === 'journal' || c.type === 'newspaper' || c.type === 'conference') && !c.journal) warnings.push('Publication name is missing for this source.');
  if (c.type === 'chapter' && !c.journal) warnings.push('The containing book title is missing for this chapter.');
  if (c.type === 'book' && !c.publisher) warnings.push('Publisher is missing for this book.');
  if (c.type === 'webpage' && !c.url) warnings.push('A URL is required to cite a webpage.');
  return warnings;
}
