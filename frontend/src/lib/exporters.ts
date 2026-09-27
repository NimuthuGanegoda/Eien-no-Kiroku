// ============================================================================
// Eien-no-Kiroku — Bibliography exporters
// Parity with ZoteroBib / MyBib / EasyBib export options:
// copy to clipboard, Word (.doc), HTML, RTF, BibTeX (.bib), RIS (.ris),
// CSV, plain text and print.
// ============================================================================

import type { Citation, CitationStyle } from './citation';
import { formatBibliography, generateBibTeX, generateCSV, generateRIS, htmlToPlain, STYLES } from './citation';

export function styleName(style: CitationStyle): string {
  return STYLES.find((s) => s.id === style)?.name || style.toUpperCase();
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function bibliographyHTML(citations: Citation[], style: CitationStyle): string {
  const entries = formatBibliography(citations, style);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Eien-no-Kiroku Bibliography — ${styleName(style)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; max-width: 720px; margin: 40px auto; line-height: 1.6; color: #111; }
  h1 { font-size: 18pt; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
  .bib-entry { margin: 0 0 12px 0; padding-left: 36px; text-indent: -36px; }
</style>
</head>
<body>
<h1>References</h1>
${entries}
</body>
</html>`;
}

export function exportHTML(citations: Citation[], style: CitationStyle) {
  download(`eien-bibliography-${style}.html`, bibliographyHTML(citations, style), 'text/html;charset=utf-8');
}

/** Word-compatible .doc (HTML flavor — opens directly in Microsoft Word) */
export function exportWord(citations: Citation[], style: CitationStyle) {
  const html = bibliographyHTML(citations, style).replace(
    '<html>',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
  );
  download(`eien-bibliography-${style}.doc`, html, 'application/msword');
}

export function exportRTF(citations: Citation[], style: CitationStyle) {
  const body = citations
    .map((c) => htmlToPlain(formatBibliography([c], style)).replace(/&[^;]+;/g, '"'))
    .join('\\par\n\\par\n');
  const rtf = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Georgia;}}\\f0\\fs24 References\\par\n\\par\n${body}}`;
  download(`eien-bibliography-${style}.rtf`, rtf, 'application/rtf');
}

export function exportBibTeX(citations: Citation[]) {
  download('eien-bibliography.bib', citations.map(generateBibTeX).join('\n\n'), 'application/x-bibtex');
}

export function exportRIS(citations: Citation[]) {
  download('eien-bibliography.ris', citations.map(generateRIS).join('\n\n'), 'application/x-research-info-systems');
}

export function exportCSV(citations: Citation[]) {
  download('eien-bibliography.csv', generateCSV(citations), 'text/csv;charset=utf-8');
}

export function exportPlainText(citations: Citation[], style: CitationStyle) {
  const text = citations.map((c) => htmlToPlain(formatBibliography([c], style))).join('\n\n');
  download(`eien-bibliography-${style}.txt`, text, 'text/plain;charset=utf-8');
}

/** Copy formatted bibliography to clipboard as HTML + plain text */
export async function copyRich(contentHtml: string): Promise<void> {
  const plain = htmlToPlain(contentHtml);
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([contentHtml], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      return;
    } catch {
      // fall through
    }
  }
  await navigator.clipboard.writeText(plain);
}

/** Print-friendly view of the bibliography (browser print dialog) */
export function printBibliography(citations: Citation[], style: CitationStyle) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(bibliographyHTML(citations, style));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}
