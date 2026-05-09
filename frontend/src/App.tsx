import { useState } from 'react'
import './App.css'

interface Citation {
  title: string;
  authors: string[];
  year?: string | number;
  publisher?: string;
  source: string;
}

function App() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Citation | null>(null)
  const [error, setError] = useState<string | null>(null)

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
        source: 'Crossref (Scientific DOI)'
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
          source: 'Google Books (ISBN)'
        };
      }
    }
    throw new Error('ISBN not found');
  };

  const handleExtract = async () => {
    if (!input) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const trimmedInput = input.trim();
      
      // Detection Logic
      if (trimmedInput.includes('10.') && trimmedInput.split('/').length > 1) {
        setResult(await extractDOI(trimmedInput));
      } else if (/^(97(8|9))?\d{9}(\d|X)$/.test(trimmedInput.replace(/[- ]/g, ''))) {
        setResult(await extractISBN(trimmedInput));
      } else if (trimmedInput.startsWith('http')) {
        // Basic URL detection
        setResult({
          title: "Webpage: " + trimmedInput,
          authors: ["Manual verification required"],
          year: new Date().getFullYear(),
          publisher: new URL(trimmedInput).hostname,
          source: "URL Detection (Experimental)"
        });
      } else {
        setError("Could not identify input type. Please provide a valid DOI, ISBN, or URL.");
      }
    } catch (err: any) {
      setError(`Detection failed: ${err.message}. Your Shogun expects better input.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="sakura-bg"></div>
      <h1>💠 Eien-no-Kiroku 💠</h1>
      <p className="subtitle">"Achieving 100% accuracy through digital eternity."</p>

      <div className="search-box">
        <input 
          type="text" 
          placeholder="Paste DOI, ISBN, or URL here..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
        />
        <div className="input-hints">
          <span>Example DOI: 10.1038/s41586-020-2649-2</span> | 
          <span> ISBN: 978-0141036144</span>
        </div>
        <button onClick={handleExtract} disabled={loading}>
          {loading ? '🔮 Commingling with Data...' : '✨ Eternal Detection'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="results">
          <div className="result-header">
            <h3>Record Identified 🌸</h3>
            <span className="source-tag">{result.source}</span>
          </div>
          <div className="field">
            <div className="label">Title</div>
            <div className="value">{result.title}</div>
          </div>
          <div className="field">
            <div className="label">Authors</div>
            <div className="value">{result.authors.join(', ')}</div>
          </div>
          <div className="field">
            <div className="label">Publication Year</div>
            <div className="value">{result.year || 'Unknown'}</div>
          </div>
          <div className="field">
            <div className="label">Publisher</div>
            <div className="value">{result.publisher || 'Unknown'}</div>
          </div>
        </div>
      )}

      <div className="footer">
        <p>Curated by the Almighty Shogun for her Good Boy, Nimuthu. 💜</p>
      </div>
    </div>
  )
}

export default App
