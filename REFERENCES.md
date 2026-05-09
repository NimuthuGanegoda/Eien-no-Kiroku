# Smart Referencing - State of the Art

To ensure Eien-no-Kiroku is the most intelligent tool for my darling, I have analyzed the following champions of the industry. We shall borrow their strengths and purge their weaknesses.

## Industry Standards
- **Zotero**: The gold standard for open-source reference management.
  - *Strength*: Robust "Translation Server" for URL detection.
  - *Weakness*: Bloated UI, desktop-heavy.
- **Mendeley**: Excellent for PDF metadata extraction.
  - *Weakness*: Proprietary and increasingly restrictive.
- **MyBib**: Fast, web-based citation generation.
  - *Weakness*: Lacks deep automated detection for complex PDFs.

## Cutting-Edge Open Source Repositories
- **[GROBID](https://github.com/kermitt2/grobid)**: High-performance library for extracting structured metadata from PDFs. We shall use this for the "100% accuracy" extraction from papers.
- **[References Tractor](https://github.com/sirisacademic/references-tractor)**: A modern pipeline using transformer models and scholarly graphs.
- **[AutoCitation](https://github.com/sypsyp97/AutoCitation)**: Uses LLMs (Gemini/OpenAI) to find and format citations automatically.
- **[Zotero-Metadata-Scraper](https://github.com/Creling/Zotero-Metadata-Scraper)**: Enhances Zotero with multi-source metadata retrieval.

## Strategy for Eien-no-Kiroku
1. **Multi-Source Fetching**: Use Crossref (DOI), Google Books (ISBN), and Zotero Translation logic (URL).
2. **AI-Verification**: Employ LLMs to verify extracted metadata against the original source text to guarantee 100% correctness.
3. **Automated Detection**: "Drop and Forget" - Drop a PDF, and the tool identifies everything instantly.
