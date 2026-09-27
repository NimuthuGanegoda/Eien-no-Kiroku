// ============================================================================
// Eien-no-Kiroku — Reference importers
// ZoteroBib "/import" parity: accept BibTeX (.bib) and RIS (.ris) content —
// pasted or uploaded — and convert into library records. Combined with the
// exporters this also acts as a BibTeX ↔ RIS converter (CiteMe tools parity).
// ============================================================================

import type { Citation, SourceType } from './citation';

function makeId(): string {
  return crypto.randomUUID();
}

const BIBTEX_TYPE_MAP: Record<string, SourceType> = {
  article: 'journal',
  inproceedings: 'conference',
  conference: 'conference',
  book: 'book',
  booklet: 'book',
  incollection: 'chapter',
  inbook: 'chapter',
  phdthesis: 'thesis',
  mastersthesis: 'thesis',
  techreport: 'report',
  report: 'report',
  misc: 'webpage',
  online: 'webpage',
  electronic: 'webpage',
  unpublished: 'report',
};

function fieldMap(fields: Record<string, string>): Citation {
  const authors = (fields.author || '')
    .split(/\s+and\s+/i)
    .map((a) => a.trim())
    .filter(Boolean);
  return {
    id: makeId(),
    type: 'webpage',
    title: (fields.title || 'Untitled').replace(/[{}]/g, ''),
    authors: authors.length ? authors.map((a) => a.replace(/[{}]/g, '')) : ['Unknown Author'],
    year: fields.year || fields.date?.match(/\d{4}/)?.[0],
    publisher: fields.publisher?.replace(/[{}]/g, ''),
    journal: (fields.journal || fields.booktitle || fields.school || fields.howpublished || '').replace(/[{}]/g, '') || undefined,
    volume: fields.volume,
    issue: fields.number,
    pages: fields.pages?.replace(/--/g, '-'),
    edition: fields.edition,
    doi: fields.doi,
    isbn: fields.isbn || fields.sn,
    url: fields.url,
    notes: fields.note?.replace(/[{}]/g, ''),
    tags: fields.keywords ? fields.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
    source: 'Imported (BibTeX)',
  };
}

/** Parse pasted/loaded BibTeX — tolerant of multi-line entries and quoted values */
export function parseBibTeX(text: string): Citation[] {
  const results: Citation[] = [];
  const entryRe = /@(\w+)\s*\{\s*([^,]*),([\s\S]*?)\n\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(text)) !== null) {
    const entryType = match[1].toLowerCase();
    const body = match[3];
    const fields: Record<string, string> = {};
    const fieldRe = /(\w+)\s*=\s*(?:\{([\s\S]*?)\}|"([\s\S]*?)"|([^,\n]+))\s*,?/g;
    let f: RegExpExecArray | null;
    while ((f = fieldRe.exec(body)) !== null) {
      fields[f[1].toLowerCase()] = (f[2] ?? f[3] ?? f[4] ?? '').trim().replace(/,\s*$/, '');
    }
    const c = fieldMap(fields);
    c.type = BIBTEX_TYPE_MAP[entryType] || 'webpage';
    results.push(c);
  }
  return results;
}

const RIS_TYPE_MAP: Record<string, SourceType> = {
  JOUR: 'journal',
  NEWS: 'newspaper',
  MGZN: 'newspaper',
  BOOK: 'book',
  CHAP: 'chapter',
  THES: 'thesis',
  RPRT: 'report',
  CONF: 'conference',
  CPAPER: 'conference',
  ELEC: 'webpage',
  ICOMM: 'webpage',
  WEB: 'webpage',
  VIDEO: 'video',
  SOUND: 'video',
};

/** Parse pasted/loaded RIS — Zotero/EndNote/Mendeley interchange format */
export function parseRIS(text: string): Citation[] {
  const results: Citation[] = [];
  const lines = text.split(/\r?\n/);
  let current: Record<string, string[]> = {};
  let year = '';
  let type: SourceType = 'webpage';

  const flush = () => {
    if (Object.keys(current).length === 0) return;
    const authors = current.AU || [];
    const title = (current.TI || current.T1 || ['Untitled'])[0];
    const pages = [current.SP?.[0], current.EP?.[0]].filter(Boolean).join('-') || undefined;
    results.push({
      id: makeId(),
      type,
      title,
      authors: authors.length ? authors : ['Unknown Author'],
      year: year || undefined,
      publisher: current.PB?.[0],
      journal: (current.JO || current.JF || current.T2 || current.BT)?.[0],
      volume: current.VL?.[0],
      issue: current.IS?.[0],
      pages,
      edition: current.ET?.[0],
      doi: current.DO?.[0],
      isbn: (current.SN || []).find((s) => /isbn/i.test(s)) || current.SN?.[0],
      url: current.UR?.[0],
      accessDate: current.Y2?.[0],
      notes: current.N1?.[0],
      tags: current.KW || [],
      source: 'Imported (RIS)',
    });
    current = {};
    year = '';
    type = 'webpage';
  };

  for (const line of lines) {
    const m = line.match(/^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/);
    if (!m) continue;
    const [, tag, value] = m;
    if (tag === 'TY') {
      flush();
      type = RIS_TYPE_MAP[value.trim().toUpperCase()] || 'webpage';
      continue;
    }
    if (tag === 'ER') {
      flush();
      continue;
    }
    if (tag === 'PY' || tag === 'Y1') {
      const y = value.match(/\d{4}/)?.[0];
      if (y) year = y;
      continue;
    }
    (current[tag] = current[tag] || []).push(value.trim());
  }
  flush();
  return results;
}

/** Auto-detect format and parse — returns [] when nothing recognizable found */
export function parseImport(text: string): Citation[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('TY  -') || /TY\s{2}-/.test(trimmed.slice(0, 200))) return parseRIS(trimmed);
  if (/^\s*@/m.test(trimmed)) return parseBibTeX(trimmed);
  // Try both as a last resort
  return parseRIS(trimmed).length ? parseRIS(trimmed) : parseBibTeX(trimmed);
}
