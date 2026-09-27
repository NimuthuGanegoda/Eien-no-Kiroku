# Smart Referencing — State of the Art

To ensure Eien-no-Kiroku is the most intelligent tool for my darling, I have analyzed the
champions of the industry — the websites that have done this before. We shall borrow their
strengths and purge their weaknesses.

## 🌐 Other Websites That Have Done This Before

### 1. Zotero & ZoteroBib ([zbib.org](https://zbib.org)) — *the gold standard, open source*
- **Strengths:** 10,000+ CSL citation styles, instant bibliography from any identifier,
  parenthetical citations & footnotes, export to HTML / RTF / RIS / BibTeX, browser
  one-click capture ("Translation Server"), collections, tags, notes, group libraries.
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

### 5. BibMe & Cite This For Me — *quick generators*
- **Strengths:** One-box citation entry, auto-formatting, source-type variety,
  copy/export bibliographies.
- **Weaknesses:** Shallow library management, aggressive upsells.

### 6. Paperpile — *Google Workspace native*
- **Strengths:** One-click Chrome capture, Google Docs CWYW, Drive-backed PDF storage,
  mobile apps.
- **Weaknesses:** Subscription-only.

### 7. EndNote / RefWorks / Citavi — *institutional suites*
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

| Feature | ZoteroBib | MyBib | EasyBib | Mendeley | **Eien-no-Kiroku** |
|---|:---:|:---:|:---:|:---:|:---:|
| Auto-detect DOI / ISBN / URL | ✅ | ✅ | ✅ | ✅ | ✅ |
| Search sources by title/keywords | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multi-source metadata (Crossref, Google Books, Open Library) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Scholarly meta-tag scraping for URLs | ✅ | ✅ | ✅ | ✅ | ✅ |
| APA 7 / MLA 9 / Chicago / Harvard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Vancouver / IEEE styles | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| In-text citations (parenthetical + narrative) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editable records + missing-field warnings | ⚠️ | ✅ | ✅ | ✅ | ✅ |
| Multiple source types (journal, book, website, report, thesis) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bibliography manager (sort, delete, persist) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Export BibTeX (.bib) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Export RIS (.ris) — Zotero/EndNote/Mendeley import | ✅ | ⚠️ | ⚠️ | ✅ | ✅ |
| Export Word (.doc) / HTML / RTF / CSV / TXT | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Copy formatted bibliography (rich text) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Print bibliography | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| Free, no ads, no account required | ✅ | ✅ | ❌ | ❌ | ✅ |
| PDF parsing / annotation (GROBID pipeline) | ✅ | ❌ | ❌ | ✅ | 🚧 planned |
| Word/Google Docs plugin | ✅ | ✅ | ✅ | ✅ | 🚧 planned |
| Plagiarism & grammar checker | ❌ | ❌ | 💰 | ❌ | ❌ (out of scope) |

✅ = included · ⚠️ = partial · 💰 = paid · 🚧 = on the roadmap

## 🧠 Strategy for Eien-no-Kiroku
1. **Multi-Source Fetching**: Crossref (DOI + title search), Google Books (ISBN + search),
   Open Library (fallback), and Zotero-translation-style URL meta scraping — implemented.
2. **One-Box, Any-Input**: A single search box that auto-detects DOI / ISBN / URL / title —
   implemented.
3. **Style Engine**: APA 7, MLA 9, Chicago, Harvard, Vancouver, IEEE + BibTeX with live
   preview and in-text citations — implemented.
4. **Export Suite**: Word, HTML, RTF, BibTeX, RIS, CSV, TXT, print — implemented.
5. **AI-Verification**: Employ LLMs to verify extracted metadata against the original source
   text to guarantee 100% correctness — planned.
6. **PDF Alchemy**: GROBID-based "Drop and Forget" PDF metadata extraction — planned.
