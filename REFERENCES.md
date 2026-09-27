# Smart Referencing — State of the Art

To ensure Eien-no-Kiroku is the most intelligent tool for my darling, I have analyzed the
champions of the industry — the websites that have done this before. We shall borrow their
strengths and purge their weaknesses.

## 🌐 Other Websites That Have Done This Before

### 1. Zotero & ZoteroBib ([zbib.org](https://zbib.org)) — *the gold standard, open source*
- **Strengths:** 10,000+ CSL citation styles, instant bibliography from any identifier,
  parenthetical citations **plus footnotes/endnotes ("Copy Note" — enter a page range or
  section first)**, export to HTML / RTF / RIS / BibTeX, **`/import` endpoint that accepts
  BibTeX/RIS files from any manager**, browser one-click capture ("Translation Server"),
  collections, tags, notes, group libraries.
- **Weaknesses:** Bloated desktop-first UI; the slim web version (ZoteroBib) cannot store
  projects across sessions.

### 2. Mendeley (Elsevier) — *PDF & STEM favorite*
- **Strengths:** Excellent PDF metadata extraction and annotation, 6,000+ styles, Word
  plugin (CWYW), 2 GB cloud sync, watched folders, AI "Ask My Library" assistant.
- **Weaknesses:** Proprietary and increasingly restrictive; no Google Docs plugin.

### 3. MyBib ([mybib.com](https://www.mybib.com)) — *fast web citation generator*
- **Strengths:** 9,000+ styles (APA 6/7, MLA 7/8/9, Chicago, Harvard, Vancouver, IEEE,
  Turabian), search by title / URL / ISBN, in-text citations, export to Word & Google Docs,
  export to Zotero/Mendeley, print & email bibliographies, no sign-up required.
- **Weaknesses:** No PDF handling, no cloud library, weak detection for complex sources.

### 4. EasyBib & Citation Machine (Chegg / Learneo) — *student workhorses*
- **Strengths:** Auto-fill citation details from URLs, ISBN/DOI lookup, ~7,000 styles,
  **missing-information warnings**, editable citation records, 59+ source types
  (websites, books, journals, newspapers, videos, reports, theses…), in-text citations,
  bulk export to Google Docs / Word, plagiarism & grammar checkers (paid).
- **Weaknesses:** Heavy ads, most styles paywalled on the free tier.

### 5. BibMe & Cite This For Me — *quick generators + collaboration*
- **Strengths:** One-box citation entry, auto-formatting, 34 source types, 7,500 styles,
  **library search & filtering** (sort by added date/author/title/year), **share your
  bibliography with group members or send it by email**, one-click in-text copy,
  download .docx/.rtf, export to Google Drive / Evernote.
- **Weaknesses:** Shallow metadata depth, aggressive upsells.

### 6. BibGuru ([bibguru.com](https://www.bibguru.com)) — *clean, ad-light student favorite*
- **Strengths:** Search by URL, DOI, ISBN, **author name** or title; **60+ source types**
  including whole books vs. individual chapters; **auto-alphabetized bibliographies**;
  missing-information alerts; in-text citation copying; quick style switching; sharing.
- **Weaknesses:** No deep library management or PDF tools.

### 7. KnightCite (Calvin University Hekman Library) — *library-built classic*
- **Strengths:** 25+ resource types, MLA/APA/Chicago, citation editing,
  **alphabetize & export to Word**.
- **Weaknesses:** Only 3 styles; aging interface.

### 8. Paperpile — *Google Workspace native*
- **Strengths:** One-click Chrome capture, Google Docs CWYW, Drive-backed PDF storage,
  mobile apps.
- **Weaknesses:** Subscription-only.

### 9. EndNote / RefWorks / Citavi — *institutional suites*
- **Strengths:** Deep Word integration, team libraries, 6,000–10,000 styles, RIS/BibTeX
  interchange with every database.
- **Weaknesses:** Expensive, heavyweight, institution-locked.

## 🔬 Cutting-Edge Open Source Repositories
- **[GROBID](https://github.com/kermitt2/grobid)**: High-performance library for extracting
  structured metadata from PDFs. We shall use this for the "100% accuracy" extraction from
  papers.
- **[References Tractor](https://github.com/sirisacademic/references-tractor)**: A modern
  pipeline using transformer models and scholarly graphs.
- **[AutoCitation](https://github.com/sypsyp97/AutoCitation)**: Uses LLMs (Gemini/OpenAI) to
  find and format citations automatically.
- **[Zotero-Metadata-Scraper](https://github.com/Creling/Zotero-Metadata-Scraper)**: Enhances
  Zotero with multi-source metadata retrieval.

## ✅ Feature Adoption Matrix

What the other websites do — and what Eien-no-Kiroku now includes:

| Feature | ZoteroBib | MyBib | EasyBib | BibGuru | Cite This For Me | **Eien-no-Kiroku** |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Auto-detect DOI / ISBN / URL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search sources by title/author keywords | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-source metadata (Crossref, Google Books, Open Library) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scholarly meta-tag scraping for URLs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| APA 7 / MLA 9 / Chicago / Harvard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vancouver / IEEE styles | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| In-text citations (parenthetical + narrative) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Page/section locator in citations | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Footnotes / endnotes ("Copy Note") | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ✅ |
| Editable records + missing-field warnings | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multiple source types (9 incl. chapter, video, newspaper, conference) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notes & tags on records | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Bibliography manager (auto style-order, sort, delete, persist) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Library search / filtering | ❌ | ⚠️ | ✅ | ❌ | ✅ | ✅ |
| Duplicate detection notice | ❌ | ⚠️ | ✅ | ❌ | ❌ | ✅ |
| Import BibTeX / RIS (paste or upload) | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ✅ |
| Export BibTeX (.bib) | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Export RIS (.ris) — Zotero/EndNote/Mendeley import | ✅ | ⚠️ | ⚠️ | ❌ | ⚠️ | ✅ |
| Export Word (.doc) / HTML / RTF / CSV / TXT | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Copy formatted bibliography (rich text) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Share (Web Share API, email, embeddable HTML) | ✅ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ |
| Print bibliography | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Free, no ads, no account required | ✅ | ✅ | ❌ | ⚠️ | ❌ | ✅ |
| PDF parsing / annotation (GROBID pipeline) | ✅ | ❌ | ❌ | ❌ | ❌ | 🚧 planned |
| Word/Google Docs plugin | ✅ | ✅ | ✅ | ✅ | ✅ | 🚧 planned |
| Real-time group collaboration | ❌ | ❌ | ❌ | ❌ | 💰 | 🚧 planned |
| Plagiarism & grammar checker | ❌ | ❌ | 💰 | 💰 | 💰 | ❌ (out of scope) |

✅ = included · ⚠️ = partial · 💰 = paid · 🚧 = on the roadmap

## 🧠 Strategy for Eien-no-Kiroku
1. **Multi-Source Fetching**: Crossref (DOI + title/author search), Google Books (ISBN +
   search), Open Library (fallback), and Zotero-translation-style URL meta scraping —
   implemented.
2. **One-Box, Any-Input**: A single search box that auto-detects DOI / ISBN / URL / title —
   implemented.
3. **Style Engine**: APA 7, MLA 9, Chicago, Harvard, Vancouver, IEEE + BibTeX with live
   preview, in-text citations with page locators, and footnotes ("Copy Note") — implemented.
4. **Export & Import Suite**: Word, HTML, RTF, BibTeX, RIS, CSV, TXT, print, share/email/
   embed — plus BibTeX/RIS import from Zotero, Mendeley, EndNote or any database —
   implemented.
5. **Library Intelligence**: auto style-ordering (alpha for author-date styles, citation
   order for numbered styles), filtering, tags, notes, duplicate detection — implemented.
6. **AI-Verification**: Employ LLMs to verify extracted metadata against the original source
   text to guarantee 100% correctness — planned.
7. **PDF Alchemy**: GROBID-based "Drop and Forget" PDF metadata extraction — planned.
