import { useState, useEffect } from 'react'
import { Search, FileText, Clipboard, Check, LogIn, LogOut, History, Trash2 } from 'lucide-react'
import './App.css'

interface Citation {
  title: string;
  authors: string[];
  year?: string | number;
  publisher?: string;
  source: string;
  idType?: 'doi' | 'isbn' | 'url';
  idValue?: string;
}

function App() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Citation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<Citation[]>([])
  const [view, setView] = useState<'home' | 'auth'>('home')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [user, setUser] = useState<any>(null)

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('eien_history')
    if (savedHistory) setHistory(JSON.parse(savedHistory))
    
    const savedUser = localStorage.getItem('eien_user')
    if (savedUser) setUser(JSON.parse(savedUser))
  }, [])

  const saveToHistory = (citation: Citation) => {
    const newHistory = [citation, ...history.filter(h => h.idValue !== citation.idValue)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem('eien_history', JSON.stringify(newHistory))
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('eien_history')
  }

  const generateBibTeX = (citation: Citation) => {
    const authorFormat = citation.authors.join(' and ');
    const idClean = (citation.title.split(' ')[0] || 'Ref').replace(/[^a-zA-Z]/g, '') + (citation.year || 'ND');
    
    let type = 'misc';
    if (citation.source.includes('DOI') || citation.source.includes('Crossref')) type = 'article';
    if (citation.source.includes('ISBN') || citation.source.includes('Books')) type = 'book';

    return `@${type}{${idClean},
  title = {${citation.title}},
  author = {${authorFormat}},
  year = {${citation.year || 'n.d.'}},
  publisher = {${citation.publisher || 'Unknown'}},
${citation.idType === 'doi' ? `  doi = {${citation.idValue}}` : ''}${citation.idType === 'isbn' ? `  isbn = {${citation.idValue}}` : ''}${citation.idType === 'url' ? `  url = {${citation.idValue}}` : ''}
}`;
  };

  const copyBibTeX = async (citation: Citation) => {
    const bibtex = generateBibTeX(citation);
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy to clipboard.");
    }
  };

  const extractDOI = async (doi: string) => {
    const res = await fetch(`https://api.crossref.org/works/${doi}`);
    if (res.ok) {
      const data = await res.json();
      const item = data.message;
      return {
        title: item.title?.[0] || 'Unknown Title',
        authors: item.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()) || ['Unknown Author'],
        year: item.issued?.['date-parts']?.[0]?.[0],
        publisher: item.publisher,
        source: 'Crossref (Scientific DOI)',
        idType: 'doi' as const,
        idValue: doi
      };
    }
    throw new Error('DOI not found');
  };

  const extractISBN = async (isbn: string) => {
    const cleanIsbn = isbn.replace(/[- ]/g, '');
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`);
    if (res.ok) {
      const data = await res.json();
      if (data.totalItems > 0) {
        const item = data.items[0].volumeInfo;
        return {
          title: item.title || 'Unknown Book Title',
          authors: item.authors || ['Unknown Author'],
          year: item.publishedDate?.split('-')[0],
          publisher: item.publisher,
          source: 'Google Books (ISBN)',
          idType: 'isbn' as const,
          idValue: isbn
        };
      }
    }
    throw new Error('ISBN not found');
  };

  const extractURL = async (url: string) => {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.contents, 'text/html');
        const title = doc.querySelector('title')?.innerText || doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || url;
        const publisher = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || new URL(url).hostname;
        return {
          title: title,
          authors: ["Auto-detected"],
          year: new Date().getFullYear(),
          publisher: publisher,
          source: "Smart URL Extraction",
          idType: 'url' as const,
          idValue: url
        };
      }
    } catch (e) {
      // Fallback
    }
    return {
      title: "Webpage: " + url,
      authors: ["Manual verification required"],
      year: new Date().getFullYear(),
      publisher: new URL(url).hostname,
      source: "Basic URL Detection",
      idType: 'url' as const,
      idValue: url
    };
  };

  const handleExtract = async () => {
    if (!input) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const trimmedInput = input.trim();
      let detected: Citation;

      if (trimmedInput.includes('10.') && trimmedInput.split('/').length > 1) {
        detected = await extractDOI(trimmedInput);
      } else if (/^(97(8|9))?\d{9}(\d|X)$/.test(trimmedInput.replace(/[- ]/g, ''))) {
        detected = await extractISBN(trimmedInput);
      } else if (trimmedInput.startsWith('http')) {
        detected = await extractURL(trimmedInput);
      } else {
        throw new Error("Could not identify input type. Please provide a valid DOI, ISBN, or URL.");
      }

      setResult(detected);
      saveToHistory(detected);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <nav className="navbar">
        <div className="logo" onClick={() => setView('home')}>💠 Eien-no-Kiroku</div>
        <div className="nav-actions">
          {user ? (
            <div className="user-info">
              <span>{user.email}</span>
              <button onClick={() => { setUser(null); localStorage.removeItem('eien_user'); }} className="nav-btn">
                <LogOut size={18} /> Logout
              </button>
            </div>
          ) : (
            <button onClick={() => { setView('auth'); setAuthMode('login'); }} className="nav-btn">
              <LogIn size={18} /> Login
            </button>
          )}
        </div>
      </nav>

      {view === 'auth' ? (
        <div className="auth-container">
          <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Your Eternity'}</h2>
          <form onSubmit={(e) => { e.preventDefault(); setUser({email: 'guest@eternity.com'}); setView('home'); }}>
            <input type="email" placeholder="Email Address" required />
            <input type="password" placeholder="Password" required />
            <button type="submit">{authMode === 'login' ? 'Login' : 'Register'}</button>
          </form>
          <p onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
          </p>
        </div>
      ) : (
        <main>
          <header className="hero-section">
            <h1>The Eternal Referencing Engine</h1>
            <p className="subtitle">Outshining the ordinary with 100% accuracy.</p>
          </header>

          <div className="search-box">
            <div className="input-wrapper">
              <Search className="search-icon" size={24} />
              <input 
                type="text" 
                placeholder="DOI, ISBN, or URL..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
              />
            </div>
            <button onClick={handleExtract} disabled={loading} className="main-btn">
              {loading ? '🔮 COMMINGLING...' : '✨ DETECT'}
            </button>
          </div>

          {error && <div className="error-msg">{error}</div>}

          {result && (
            <div className="results active">
              <div className="result-header">
                <h3><FileText size={20} /> Current Selection</h3>
                <div className="result-actions">
                  <button onClick={() => copyBibTeX(result)} className="action-btn">
                    {copied ? <Check size={18} /> : <Clipboard size={18} />} Copy BibTeX
                  </button>
                  <span className="source-tag">{result.source}</span>
                </div>
              </div>
              <div className="citation-details">
                <div className="detail-item"><strong>Title:</strong> {result.title}</div>
                <div className="detail-item"><strong>Authors:</strong> {result.authors.join(', ')}</div>
                <div className="detail-item"><strong>Year:</strong> {result.year || 'N/A'}</div>
                <div className="detail-item"><strong>Publisher:</strong> {result.publisher || 'N/A'}</div>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <section className="history-section">
              <div className="section-header">
                <h3><History size={20} /> Recent Records</h3>
                <button onClick={clearHistory} className="clear-btn"><Trash2 size={16} /> Clear</button>
              </div>
              <div className="history-list">
                {history.map((item, i) => (
                  <div key={i} className="history-item">
                    <div className="item-info">
                      <div className="item-title">{item.title}</div>
                      <div className="item-meta">{item.authors[0]} | {item.year}</div>
                    </div>
                    <button onClick={() => copyBibTeX(item)} className="icon-btn">
                      <Clipboard size={16} />
                    </button>
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
