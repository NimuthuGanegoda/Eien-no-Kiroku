import { useState, useMemo } from 'react'
import {
  Search, FileText, Clipboard, Check, LogIn, LogOut, Trash2, Download,
  Printer, AlertTriangle, Edit3, X, Plus, Upload, Share2, Mail, StickyNote,
} from 'lucide-react'
import './App.css'
import type { Citation, CitationStyle, SourceType } from './lib/citation'
import {
  STYLES, SOURCE_TYPES, autoOrder, blankCitation, containerLabel, formatBibliography,
  formatCitation, formatFootnote, generateBibTeX, inTextNarrative, inTextParenthetical,
  missingFieldWarnings,
} from './lib/citation'
import { detectAndFetch } from './lib/metadata'
import { parseImport } from './lib/importers'
import {
  copyRich, emailBibliography, embedHTML, exportBibTeX, exportCSV, exportHTML,
  exportPlainText, exportRIS, exportRTF, exportWord, printBibliography,
  shareBibliography, styleName,
} from './lib/exporters'

// ---------------------------------------------------------------------------
// Persistence (MyBib "My Citations" / EasyBib "My Bibliography" parity)
// ---------------------------------------------------------------------------

const LIBRARY_KEY = 'eien_library'
const STYLE_KEY = 'eien_style'
const USER_KEY = 'eien_user'

function loadLibrary(): Citation[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (raw) return JSON.parse(raw)
    // Migrate legacy "eien_history" records
    const legacy = localStorage.getItem('eien_history')
    if (legacy) {
      const parsed: {
        title?: string
        authors?: string[]
        year?: string | number
        publisher?: string
        idType?: string
        idValue?: string
        source?: string
      }[] = JSON.parse(legacy)
      return parsed.map((h) => ({
        id: crypto.randomUUID(),
        type: (h.idType === 'doi' ? 'journal' : h.idType === 'isbn' ? 'book' : 'webpage') as SourceType,
        title: h.title || 'Untitled',
        authors: h.authors || ['Unknown Author'],
        year: h.year ? String(h.year) : undefined,
        publisher: h.publisher,
        doi: h.idType === 'doi' ? h.idValue : undefined,
        isbn: h.idType === 'isbn' ? h.idValue : undefined,
        url: h.idType === 'url' ? h.idValue : undefined,
        source: h.source || 'Legacy Record',
      }))
    }
  } catch {
    /* corrupted storage — start fresh */
  }
  return []
}

function recordKey(c: Citation): string {
  return (c.doi || c.isbn || c.url || c.title).toLowerCase().trim()
}

// ---------------------------------------------------------------------------

function App() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<Citation | null>(null)
  const [searchResults, setSearchResults] = useState<Citation[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [library, setLibrary] = useState<Citation[]>(loadLibrary)
  const [style, setStyle] = useState<CitationStyle>(() => {
    const saved = localStorage.getItem(STYLE_KEY) as CitationStyle | null
    return saved && STYLES.some((s) => s.id === saved) ? saved : 'apa'
  })
  const [sort, setSort] = useState<'auto' | 'recent' | 'author' | 'year' | 'title'>('auto')
  const [filter, setFilter] = useState('')
  const [locator, setLocator] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [view, setView] = useState<'home' | 'auth'>('home')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [user, setUser] = useState<{ email: string } | null>(() => {
    const saved = localStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) : null
  })

  const persistLibrary = (next: Citation[]) => {
    setLibrary(next)
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next))
  }

  const flashCopied = (key: string) => {
    setCopiedKey(key)
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000)
  }

  const changeStyle = (s: CitationStyle) => {
    setStyle(s)
    localStorage.setItem(STYLE_KEY, s)
  }

  // -------------------------------------------------------------------------
  // Detection pipeline
  // -------------------------------------------------------------------------

  const addToLibrary = (citation: Citation) => {
    const exists = library.some((h) => recordKey(h) === recordKey(citation))
    const next = [citation, ...library.filter((h) => recordKey(h) !== recordKey(citation))]
    persistLibrary(next)
    setNotice(
      exists
        ? 'This source is already in your bibliography — the record has been updated with the latest details.'
        : 'Saved to My Bibliography.'
    )
    setTimeout(() => setNotice(null), 4000)
  }

  const handleExtract = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError(null)
    setNotice(null)
    setSearchResults(null)
    setDraft(null)
    try {
      const detected = await detectAndFetch(input.trim())
      if (Array.isArray(detected)) {
        if (detected.length === 0) throw new Error('No matching sources found. Try a DOI, ISBN, URL, or a more specific title.')
        if (detected.length === 1) {
          setDraft(detected[0])
          addToLibrary(detected[0])
        } else {
          setSearchResults(detected)
        }
      } else {
        setDraft(detected)
        addToLibrary(detected)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pickResult = (c: Citation) => {
    setDraft(c)
    setSearchResults(null)
    addToLibrary(c)
  }

  const updateDraft = (patch: Partial<Citation>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d))
    setLibrary((lib) => {
      const next = lib.map((h) => (draft && h.id === draft.id ? { ...h, ...patch } : h))
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(next))
      return next
    })
  }

  const startManualEntry = () => {
    setError(null)
    setNotice(null)
    setSearchResults(null)
    setDraft(blankCitation('journal'))
  }

  const removeItem = (id: string) => {
    persistLibrary(library.filter((h) => h.id !== id))
    if (draft?.id === id) setDraft(null)
  }

  const clearLibrary = () => {
    persistLibrary([])
    setDraft(null)
    setSearchResults(null)
  }

  // -------------------------------------------------------------------------
  // Import (ZoteroBib "/import" parity — pasted or uploaded BibTeX / RIS)
  // -------------------------------------------------------------------------

  const runImport = (text: string) => {
    const parsed = parseImport(text)
    if (parsed.length === 0) {
      setError('Nothing recognizable found. Paste BibTeX (.bib) or RIS (.ris) content.')
      return
    }
    setError(null)
    const merged = [...library]
    let added = 0
    let updated = 0
    for (const c of parsed) {
      const idx = merged.findIndex((h) => recordKey(h) === recordKey(c))
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...c, id: merged[idx].id, notes: merged[idx].notes || c.notes }
        updated++
      } else {
        merged.push(c)
        added++
      }
    }
    persistLibrary(merged)
    setImportOpen(false)
    setImportText('')
    setNotice(`Import complete — ${added} added, ${updated} updated.`)
    setTimeout(() => setNotice(null), 5000)
  }

  const handleFileImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => runImport(String(reader.result || ''))
    reader.readAsText(file)
  }

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const sortedLibrary = useMemo(() => {
    if (sort === 'auto') return autoOrder(library, style)
    const copy = [...library]
    if (sort === 'author') copy.sort((a, b) => (a.authors[0] || '').localeCompare(b.authors[0] || ''))
    else if (sort === 'year') copy.sort((a, b) => (b.year || '0').localeCompare(a.year || '0'))
    else if (sort === 'title') copy.sort((a, b) => a.title.localeCompare(b.title))
    return copy
  }, [library, sort, style])

  const filteredLibrary = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return sortedLibrary
    return sortedLibrary.filter((c) =>
      [c.title, c.authors.join(' '), c.journal || '', c.publisher || '', c.year || '', (c.tags || []).join(' '), c.notes || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [sortedLibrary, filter])

  const warnings = useMemo(() => (draft ? missingFieldWarnings(draft, style) : []), [draft, style])

  const copyText = async (text: string, key: string, rich = false) => {
    try {
      if (rich) await copyRich(text)
      else await navigator.clipboard.writeText(text)
      flashCopied(key)
    } catch {
      setError('Failed to copy to clipboard.')
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="container">
      <nav className="navbar">
        <div className="logo" onClick={() => setView('home')}>💠 Eien-no-Kiroku</div>
        <div className="nav-actions">
          {user ? (
            <div className="user-info">
              <span>{user.email}</span>
              <button onClick={() => { setUser(null); localStorage.removeItem(USER_KEY) }} className="nav-btn">
                <LogOut size={18} /> Logout
              </button>
            </div>
          ) : (
            <button onClick={() => { setView('auth'); setAuthMode('login') }} className="nav-btn">
              <LogIn size={18} /> Login
            </button>
          )}
        </div>
      </nav>

      {view === 'auth' ? (
        <div className="auth-container">
          <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Your Eternity'}</h2>
          <form onSubmit={(e) => {
            e.preventDefault()
            const target = e.target as HTMLFormElement
            const email = (target.elements[0] as HTMLInputElement).value
            setUser({ email })
            localStorage.setItem(USER_KEY, JSON.stringify({ email }))
            setView('home')
          }}>
            <input type="email" placeholder="Email Address" required />
            <input type="password" placeholder="Password" required />
            <button type="submit">{authMode === 'login' ? 'Login' : 'Register'}</button>
          </form>
          <p onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
          </p>
        </div>
      ) : (
        <main>
          <header className="hero-section">
            <h1>The Eternal Referencing Engine</h1>
            <p className="subtitle">
              Cite anything — DOI, ISBN, URL or title — in APA, MLA, Chicago, Harvard, Vancouver, IEEE &amp; BibTeX.
            </p>
          </header>

          <div className="search-box">
            <div className="input-wrapper">
              <Search className="search-icon" size={24} />
              <input
                type="text"
                placeholder="Paste a DOI, ISBN, URL — or type a title to search..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              />
            </div>
            <button onClick={handleExtract} disabled={loading} className="main-btn">
              {loading ? '🔮 DETECTING...' : '✨ DETECT'}
            </button>
          </div>

          <div className="search-actions">
            <span className="detect-hint">Auto-detects: DOI · ISBN · URL · Title/author keywords</span>
            <div className="btn-row">
              <button onClick={startManualEntry} className="ghost-btn"><Plus size={15} /> Enter manually</button>
              <button onClick={() => setImportOpen((v) => !v)} className="ghost-btn"><Upload size={15} /> Import BibTeX / RIS</button>
            </div>
          </div>

          {error && (
            <div className="error-msg">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
          {notice && (
            <div className="notice-msg">
              <Check size={16} /> {notice}
            </div>
          )}

          {/* -------- Import panel (ZoteroBib /import parity) -------- */}
          {importOpen && (
            <div className="results active">
              <div className="result-header">
                <h3><Upload size={20} /> Import References</h3>
                <button onClick={() => setImportOpen(false)} className="icon-btn"><X size={16} /></button>
              </div>
              <p className="import-hint">
                Paste BibTeX or RIS content below — or upload a .bib / .ris file exported from Zotero, Mendeley, EndNote or any database.
              </p>
              <textarea
                className="import-textarea"
                placeholder={'@article{key,\n  title = {...},\n  author = {...}\n}\n\n— or —\n\nTY  - JOUR\nAU  - Smith, John\nTI  - Title\nER  - '}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="result-actions">
                <label className="action-btn file-label">
                  <Upload size={18} /> Choose file
                  <input
                    type="file"
                    accept=".bib,.ris,.txt"
                    onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0])}
                  />
                </label>
                <button onClick={() => runImport(importText)} className="action-btn" disabled={!importText.trim()}>
                  <Check size={18} /> Import
                </button>
              </div>
            </div>
          )}

          {/* -------- Search result picker (title search) -------- */}
          {searchResults && (
            <div className="results active">
              <div className="result-header">
                <h3><Search size={20} /> {searchResults.length} sources found — pick one</h3>
                <button onClick={() => setSearchResults(null)} className="icon-btn"><X size={16} /></button>
              </div>
              <div className="results-picker">
                {searchResults.map((r) => (
                  <button key={r.id} className="picker-item" onClick={() => pickResult(r)}>
                    <div className="item-title">{r.title}</div>
                    <div className="item-meta">
                      {r.authors[0]} · {r.year || 'n.d.'} · {r.source}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -------- Current selection: editable record + style preview -------- */}
          {draft && (
            <div className="results active">
              <div className="result-header">
                <h3><FileText size={20} /> {draft.source === 'Manual Entry' ? 'Manual Entry' : 'Current Selection'}</h3>
                <div className="result-actions">
                  <span className="source-tag">{draft.source}</span>
                  <button onClick={() => setDraft(null)} className="icon-btn"><X size={16} /></button>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="warning-box">
                  {warnings.map((w, i) => (
                    <div key={i}><AlertTriangle size={14} /> {w}</div>
                  ))}
                </div>
              )}

              <div className="field-grid">
                <label className="field span-2">
                  <span>Source Type</span>
                  <select value={draft.type} onChange={(e) => updateDraft({ type: e.target.value as SourceType })}>
                    {SOURCE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <label className="field span-2">
                  <span>Title</span>
                  <input value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} />
                </label>
                <label className="field span-2">
                  <span>Authors (comma separated)</span>
                  <input
                    value={draft.authors.join(', ')}
                    onChange={(e) => updateDraft({ authors: e.target.value.split(',').map((a) => a.trim()).filter(Boolean) })}
                  />
                </label>
                <label className="field">
                  <span>Year</span>
                  <input value={draft.year || ''} onChange={(e) => updateDraft({ year: e.target.value })} />
                </label>
                <label className="field">
                  <span>Publisher</span>
                  <input value={draft.publisher || ''} onChange={(e) => updateDraft({ publisher: e.target.value })} />
                </label>
                <label className="field">
                  <span>{containerLabel(draft.type)}</span>
                  <input value={draft.journal || ''} onChange={(e) => updateDraft({ journal: e.target.value })} />
                </label>
                <label className="field">
                  <span>Volume</span>
                  <input value={draft.volume || ''} onChange={(e) => updateDraft({ volume: e.target.value })} />
                </label>
                <label className="field">
                  <span>Issue</span>
                  <input value={draft.issue || ''} onChange={(e) => updateDraft({ issue: e.target.value })} />
                </label>
                <label className="field">
                  <span>Pages</span>
                  <input value={draft.pages || ''} onChange={(e) => updateDraft({ pages: e.target.value })} />
                </label>
                <label className="field">
                  <span>URL</span>
                  <input value={draft.url || ''} onChange={(e) => updateDraft({ url: e.target.value })} />
                </label>
                <label className="field">
                  <span>DOI</span>
                  <input value={draft.doi || ''} onChange={(e) => updateDraft({ doi: e.target.value })} />
                </label>
                <label className="field">
                  <span>Accessed</span>
                  <input type="date" value={draft.accessDate || ''} onChange={(e) => updateDraft({ accessDate: e.target.value })} />
                </label>
                <label className="field span-2">
                  <span>Tags (comma separated)</span>
                  <input
                    value={(draft.tags || []).join(', ')}
                    onChange={(e) => updateDraft({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
                  />
                </label>
                <label className="field span-2">
                  <span>Notes</span>
                  <input value={draft.notes || ''} onChange={(e) => updateDraft({ notes: e.target.value })} />
                </label>
              </div>

              {/* -------- Style switcher + formatted preview -------- */}
              <div className="style-tabs">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    className={`style-tab ${style === s.id ? 'active' : ''}`}
                    onClick={() => changeStyle(s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              <div className="preview-box" dangerouslySetInnerHTML={{ __html: formatCitation(draft, style) }} />

              <div className="result-actions intext-row">
                {library.some((h) => h.id === draft.id) ? (
                  <span className="source-tag">✓ In Bibliography</span>
                ) : (
                  <button onClick={() => addToLibrary(draft)} className="action-btn">
                    <Check size={18} /> Save to Bibliography
                  </button>
                )}
                <label className="locator-wrap">
                  <span>p./§</span>
                  <input
                    className="locator-input"
                    placeholder="45 or 45-47"
                    value={locator}
                    onChange={(e) => setLocator(e.target.value)}
                  />
                </label>
                <button
                  onClick={() => copyText(formatBibliography([draft], style), 'ref', true)}
                  className="action-btn"
                >
                  {copiedKey === 'ref' ? <Check size={18} /> : <Clipboard size={18} />} Copy Citation
                </button>
                <button
                  onClick={() => copyText(inTextParenthetical(draft, style, Math.max(1, sortedLibrary.findIndex((h) => h.id === draft.id) + 1), locator), 'in-paren')}
                  className="action-btn"
                >
                  {copiedKey === 'in-paren' ? <Check size={18} /> : <Clipboard size={18} />} In-text: {inTextParenthetical(draft, style, 1, locator)}
                </button>
                <button
                  onClick={() => copyText(inTextNarrative(draft, style, Math.max(1, sortedLibrary.findIndex((h) => h.id === draft.id) + 1), locator), 'in-narr')}
                  className="action-btn"
                >
                  {copiedKey === 'in-narr' ? <Check size={18} /> : <Clipboard size={18} />} Narrative
                </button>
                <button
                  onClick={() => copyText(formatFootnote(draft, locator), 'note', true)}
                  className="action-btn"
                >
                  {copiedKey === 'note' ? <Check size={18} /> : <StickyNote size={18} />} Copy Note (footnote)
                </button>
                {style === 'bibtex' && (
                  <button onClick={() => copyText(generateBibTeX(draft), 'bib')} className="action-btn">
                    {copiedKey === 'bib' ? <Check size={18} /> : <Clipboard size={18} />} Copy BibTeX
                  </button>
                )}
              </div>
            </div>
          )}

          {/* -------- My Bibliography (library manager) -------- */}
          {library.length > 0 && (
            <section className="history-section">
              <div className="section-header">
                <h3><FileText size={20} /> My Bibliography ({filteredLibrary.length}{filter ? `/${library.length}` : ''})</h3>
                <div className="section-tools">
                  <div className="input-wrapper mini">
                    <Search className="search-icon" size={15} />
                    <input
                      className="filter-input"
                      placeholder="Filter library..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>
                  <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="sort-select">
                    <option value="auto">Style order</option>
                    <option value="recent">Recent first</option>
                    <option value="author">Author A–Z</option>
                    <option value="year">Year (newest)</option>
                    <option value="title">Title A–Z</option>
                  </select>
                  <button onClick={clearLibrary} className="clear-btn"><Trash2 size={16} /> Clear</button>
                </div>
              </div>

              <div className="export-bar">
                <button onClick={() => copyText(formatBibliography(sortedLibrary, style), 'bib-copy', true)} className="export-btn">
                  {copiedKey === 'bib-copy' ? <Check size={15} /> : <Clipboard size={15} />} Copy {styleName(style)}
                </button>
                <button onClick={() => exportWord(sortedLibrary, style)} className="export-btn"><Download size={15} /> Word</button>
                <button onClick={() => exportHTML(sortedLibrary, style)} className="export-btn"><Download size={15} /> HTML</button>
                <button onClick={() => exportRTF(sortedLibrary, style)} className="export-btn"><Download size={15} /> RTF</button>
                <button onClick={() => exportBibTeX(sortedLibrary)} className="export-btn"><Download size={15} /> BibTeX</button>
                <button onClick={() => exportRIS(sortedLibrary)} className="export-btn"><Download size={15} /> RIS</button>
                <button onClick={() => exportCSV(sortedLibrary)} className="export-btn"><Download size={15} /> CSV</button>
                <button onClick={() => exportPlainText(sortedLibrary, style)} className="export-btn"><Download size={15} /> TXT</button>
                <button onClick={() => printBibliography(sortedLibrary, style)} className="export-btn"><Printer size={15} /> Print</button>
                <button onClick={() => shareBibliography(sortedLibrary, style)} className="export-btn"><Share2 size={15} /> Share</button>
                <button onClick={() => emailBibliography(sortedLibrary, style)} className="export-btn"><Mail size={15} /> Email</button>
                <button
                  onClick={() => copyText(embedHTML(sortedLibrary, style), 'embed')}
                  className="export-btn"
                  title="Copy an HTML snippet to embed the bibliography in a webpage"
                >
                  {copiedKey === 'embed' ? <Check size={15} /> : <Clipboard size={15} />} Embed HTML
                </button>
              </div>

              <div className="bib-preview" dangerouslySetInnerHTML={{ __html: formatBibliography(sortedLibrary, style) }} />

              <div className="history-list">
                {filteredLibrary.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="item-info">
                      <div className="item-title">{item.title}</div>
                      <div className="item-meta">
                        {item.authors[0]} | {item.year || 'n.d.'} | {SOURCE_TYPES.find((t) => t.id === item.type)?.name}
                        {(item.tags || []).length > 0 && <> | {(item.tags || []).map((t) => <span key={t} className="tag-chip">{t}</span>)}</>}
                        {item.notes && <> | <StickyNote size={11} style={{ verticalAlign: '-1px' }} /> {item.notes.slice(0, 60)}{item.notes.length > 60 ? '…' : ''}</>}
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        onClick={() => copyText(inTextParenthetical(item, style, sortedLibrary.findIndex((x) => x.id === item.id) + 1, locator), `item-paren-${item.id}`)}
                        className="icon-btn"
                        title="Copy in-text citation"
                      >
                        {copiedKey === `item-paren-${item.id}` ? <Check size={16} /> : <Clipboard size={16} />}
                      </button>
                      <button
                        onClick={() => copyText(formatFootnote(item, locator), `item-note-${item.id}`)}
                        className="icon-btn"
                        title="Copy footnote"
                      >
                        {copiedKey === `item-note-${item.id}` ? <Check size={16} /> : <StickyNote size={16} />}
                      </button>
                      <button onClick={() => { setDraft(item); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="icon-btn" title="Edit record">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="icon-btn" title="Remove">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      <footer className="footer">
        <p>Built with devotion for Nimuthu Ganegoda. 🏛️💜</p>
      </footer>
    </div>
  )
}

export default App
