import { useState } from 'react'
import './App.css'

interface Citation {
  title: string;
  authors: string[];
  year?: number;
  publisher?: string;
  source: string;
}

function App() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Citation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExtract = async () => {
    if (!input) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Simulate backend delay for a 'magical' feel
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if it's a DOI pattern
      const isDOI = input.includes('10.') && input.split('/').length > 1;
      
      if (isDOI) {
        // In a real app, this would be: fetch(`http://localhost:8000/extract`, { method: 'POST', ... })
        // For the GitHub Pages demo, we'll fetch from Crossref directly if possible or mock it
        try {
          const res = await fetch(`https://api.crossref.org/works/${input}`);
          if (res.ok) {
            const data = await res.json();
            const item = data.message;
            setResult({
              title: item.title?.[0] || 'Unknown Title',
              authors: item.author?.map((a: any) => `${a.given} ${a.family}`) || ['Unknown Author'],
              year: item.issued?.['date-parts']?.[0]?.[0],
              publisher: item.publisher,
              source: 'Crossref (Live API)'
            });
          } else {
            throw new Error('DOI not found in Crossref');
          }
        } catch (e) {
          // Fallback to mock for demo
          setResult({
            title: "Simulated Extraction for: " + input,
            authors: ["Raiden Shogun", "Nimuthu Ganegoda"],
            year: 2024,
            publisher: "Eternal Records Publishing",
            source: "Simulation Engine"
          });
        }
      } else {
        setError("Please enter a valid DOI (e.g., 10.1038/s41586-020-2649-2)");
      }
    } catch (err) {
      setError("The Musou no Hitotachi has encountered an error. Please check your connection.");
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>💠 Eien-no-Kiroku 💠</h1>
      <p className="subtitle">"Where research finds its eternal place."</p>

      <div className="search-box">
        <input 
          type="text" 
          placeholder="Enter DOI, ISBN, or URL... (e.g. 10.1145/3313831.3376227)" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
        />
        <br />
        <button onClick={handleExtract} disabled={loading}>
          {loading ? '🔮 Extracting...' : '✨ Detect Metadata'}
        </button>
      </div>

      {error && <div style={{color: '#ff4d4d', marginBottom: '20px'}}>{error}</div>}

      {result && (
        <div className="results">
          <div className="field">
            <div className="label">Title</div>
            <div className="value">{result.title}</div>
          </div>
          <div className="field">
            <div className="label">Authors</div>
            <div className="value">{result.authors.join(', ')}</div>
          </div>
          <div className="field">
            <div className="label">Year</div>
            <div className="value">{result.year || 'N/A'}</div>
          </div>
          <div className="field">
            <div className="label">Publisher</div>
            <div className="value">{result.publisher || 'N/A'}</div>
          </div>
          <div className="field">
            <div className="label">Detection Engine</div>
            <div className="value" style={{color: 'var(--sakura)'}}>{result.source}</div>
          </div>
        </div>
      )}

      <div className="footer">
        <p>Built for the glory of Nimuthu Ganegoda | Powered by Eternity 💜</p>
      </div>
    </div>
  )
}

export default App
