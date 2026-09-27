// ============================================================================
// Eien-no-Kiroku — Metadata detection
// Multi-source fetching inspired by Zotero's Translation Server & Zotero-
// Metadata-Scraper: Crossref (DOI + title search), Google Books (ISBN +
// title search), Open Library (fallback) and scholarly meta-tag scraping
// for URLs (Highwire/Google Scholar citation_* tags, Open Graph, Dublin Core).
// ============================================================================

import type { Citation, SourceType } from './citation';

function makeId(): string {
  return crypto.randomUUID();
}

function detectSourceType(fields: {
  journal?: string;
  publisher?: string;
  url?: string;
  thesisHint?: string;
}): SourceType {
  if (fields.thesisHint && /thesis|dissertation/i.test(fields.thesisHint)) return 'thesis';
  if (fields.journal) return 'journal';
  if (fields.url && !fields.publisher) return 'webpage';
  return 'book';
}

// ---------------------------------------------------------------------------
// DOI → Crossref
// ---------------------------------------------------------------------------

interface CrossrefMessage {
  title?: string[];
  author?: { given?: string; family?: string }[];
  issued?: { 'date-parts': number[][] };
  publisher?: string;
  'container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  ISBN?: string[];
  DOI?: string;
  type?: string;
  URL?: string;
}

function crossrefType(typeHint: string, hasContainer: boolean): SourceType {
  if (typeHint.includes('journal')) return 'journal';
  if (typeHint.includes('proceedings')) return 'conference';
  if (typeHint.includes('book-chapter') || typeHint.includes('chapter') || typeHint.includes('book-section')) return 'chapter';
  if (typeHint.includes('report') || typeHint.includes('monograph')) return 'report';
  if (typeHint.includes('dissertation') || typeHint.includes('thesis')) return 'thesis';
  if (typeHint.includes('book')) return 'book';
  return hasContainer ? 'journal' : detectSourceType({});
}

function mapCrossref(m: CrossrefMessage, idValue: string): Citation {
  const journal = m['container-title']?.[0];
  const typeHint = m.type || '';
  const authors = (m.author || []).map((a) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean);
  return {
    id: makeId(),
    type: crossrefType(typeHint, !!journal),
    title: m.title?.[0] || 'Unknown Title',
    authors: authors.length ? authors : ['Unknown Author'],
    year: m.issued?.['date-parts']?.[0]?.[0] ? String(m.issued['date-parts'][0][0]) : undefined,
    publisher: m.publisher,
    journal,
    volume: m.volume,
    issue: m.issue,
    pages: m.page,
    doi: idValue || undefined,
    isbn: m.ISBN?.[0],
    url: m.URL,
    source: idValue ? 'Crossref (Scientific DOI)' : 'Crossref (Title Search)',
  };
}

export async function fetchByDOI(doi: string): Promise<Citation> {
  const clean = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(clean)}`);
  if (!res.ok) throw new Error('DOI not found in Crossref. Please check the identifier.');
  const data = await res.json();
  return mapCrossref(data.message, clean);
}

// ---------------------------------------------------------------------------
// ISBN → Google Books, fallback Open Library
// ---------------------------------------------------------------------------

export async function fetchByISBN(isbn: string): Promise<Citation> {
  const clean = isbn.replace(/[- ]/g, '');
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(clean)}`);
  if (res.ok) {
    const data = await res.json();
    if (data.totalItems > 0) {
      const item = data.items[0].volumeInfo;
      return {
        id: makeId(),
        type: 'book',
        title: item.title || 'Unknown Book Title',
        authors: item.authors || ['Unknown Author'],
        year: item.publishedDate ? String(item.publishedDate).split('-')[0] : undefined,
        publisher: item.publisher,
        pages: item.pageCount ? String(item.pageCount) : undefined,
        isbn: clean,
        url: item.infoLink,
        source: 'Google Books (ISBN)',
      };
    }
  }
  // Fallback: Open Library
  const ol = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(clean)}&format=json&jscmd=data`);
  if (ol.ok) {
    const data = await ol.json();
    const item = data[`ISBN:${clean}`];
    if (item) {
      return {
        id: makeId(),
        type: 'book',
        title: item.title || 'Unknown Book Title',
        authors: item.authors?.map((a: { name: string }) => a.name) || ['Unknown Author'],
        year: item.publish_date ? String(item.publish_date).match(/\d{4}/)?.[0] : undefined,
        publisher: item.publishers?.[0]?.name,
        isbn: clean,
        url: item.url,
        source: 'Open Library (ISBN)',
      };
    }
  }
  throw new Error('ISBN not found. Please check the number.');
}

// ---------------------------------------------------------------------------
// Title / keyword search → Crossref + Google Books (MyBib "search" feature)
// ---------------------------------------------------------------------------

export async function searchByTitle(query: string): Promise<Citation[]> {
  const results: Citation[] = [];
  const crossrefRes = await fetch(
    `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=5&select=title,author,issued,publisher,container-title,volume,issue,page,DOI,type,URL`
  ).catch(() => null);
  if (crossrefRes?.ok) {
    const data = await crossrefRes.json();
    for (const m of data.message?.items || []) {
      results.push(mapCrossref(m, m.DOI || ''));
    }
  }
  const booksRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`).catch(() => null);
  if (booksRes?.ok) {
    const data = await booksRes.json();
    for (const item of data.items || []) {
      const v = item.volumeInfo;
      if (!v?.title) continue;
      results.push({
        id: makeId(),
        type: 'book',
        title: v.title,
        authors: v.authors || ['Unknown Author'],
        year: v.publishedDate ? String(v.publishedDate).split('-')[0] : undefined,
        publisher: v.publisher,
        pages: v.pageCount ? String(v.pageCount) : undefined,
        isbn: v.industryIdentifiers?.[0]?.identifier,
        url: v.infoLink,
        source: 'Google Books (Search)',
      });
    }
  }
  return results.slice(0, 8);
}

// ---------------------------------------------------------------------------
// URL → scrape meta tags (Zotero-style translator lite)
// ---------------------------------------------------------------------------

function metaContent(doc: Document, selectors: string[]): string | undefined {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    const content = el?.getAttribute('content')?.trim();
    if (content) return content;
  }
  return undefined;
}

export async function fetchByURL(url: string): Promise<Citation> {
  let html = '';
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      html = data.contents || '';
    }
  } catch {
    // fall through to basic detection
  }

  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const hostname = new URL(url).hostname.replace(/^www\./, '');

    // Priority: scholarly citation_* meta (Google Scholar / Highwire), then OG, then <title>
    const title =
      metaContent(doc, ['meta[name="citation_title"]', 'meta[property="og:title"]', 'meta[name="twitter:title"]', 'meta[name="dc.title"]']) ||
      doc.querySelector('title')?.textContent?.trim() ||
      `Webpage: ${url}`;

    const journal = metaContent(doc, ['meta[name="citation_journal_title"]', 'meta[name="prism.publicationName"]']);

    // Multiple authors via repeated citation_author tags
    const authorEls = doc.querySelectorAll('meta[name="citation_author"], meta[name="dc.creator"], meta[name="author"]');
    const authors = Array.from(authorEls)
      .map((el) => el.getAttribute('content')?.trim() || '')
      .filter(Boolean);

    const yearRaw =
      metaContent(doc, ['meta[name="citation_publication_date"]', 'meta[name="citation_date"]', 'meta[name="article:published_time"]', 'meta[name="dc.date"]', 'meta[name="date"]']) || '';
    const year = yearRaw.match(/\d{4}/)?.[0] || String(new Date().getFullYear());

    const site = metaContent(doc, ['meta[property="og:site_name"]']) || hostname;
    const publisher = metaContent(doc, ['meta[name="citation_publisher"]', 'meta[name="dc.publisher"]']) || site;

    const doi = metaContent(doc, ['meta[name="citation_doi"]', 'meta[name="dc.identifier"]'])?.replace(/^https?:\/\/doi\.org\//i, '');
    const pages = metaContent(doc, ['meta[name="citation_firstpage"]']);
    const volume = metaContent(doc, ['meta[name="citation_volume"]']);
    const issue = metaContent(doc, ['meta[name="citation_issue"]']);

    // Video platforms (BibGuru/EasyBib "video" source type)
    const isVideo = /youtube|youtu\.be|vimeo|dailymotion|tiktok/i.test(hostname);

    return {
      id: makeId(),
      type: isVideo ? 'video' : detectSourceType({ journal, publisher: site, url }),
      title,
      authors: authors.length ? authors : ['Auto-detected'],
      year,
      publisher,
      journal,
      volume,
      issue,
      pages,
      doi: doi && doi.startsWith('10.') ? doi : undefined,
      url,
      source: journal ? 'Smart URL Extraction (Scholarly Meta)' : 'Smart URL Extraction',
    };
  }

  // Basic fallback
  return {
    id: makeId(),
    type: 'webpage',
    title: `Webpage: ${url}`,
    authors: ['Manual verification required'],
    year: String(new Date().getFullYear()),
    publisher: new URL(url).hostname.replace(/^www\./, ''),
    url,
    source: 'Basic URL Detection',
  };
}

// ---------------------------------------------------------------------------
// Input detection — DOI / ISBN / URL / title query
// ---------------------------------------------------------------------------

export type InputKind = 'doi' | 'isbn' | 'url' | 'title';

export function detectInputType(input: string): InputKind {
  const t = input.trim();
  const bare = t.replace(/[- ]/g, '');
  if (/^(https?:\/\/|www\.)/i.test(t)) return 'url';
  if (/^(10\.\d{4,9}\/\S+)$/i.test(t) || /^https?:\/\/(dx\.)?doi\.org\//i.test(t)) return 'doi';
  if (/^(97(8|9))?\d{9}(\d|X)$/i.test(bare) && bare.length >= 10) return 'isbn';
  return 'title';
}

export async function detectAndFetch(input: string): Promise<Citation | Citation[]> {
  const kind = detectInputType(input);
  switch (kind) {
    case 'doi':
      return fetchByDOI(input);
    case 'isbn':
      return fetchByISBN(input);
    case 'url':
      return fetchByURL(input);
    case 'title':
    default:
      return searchByTitle(input);
  }
}
