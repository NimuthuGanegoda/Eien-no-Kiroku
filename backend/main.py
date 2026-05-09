from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import requests
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Eien-no-Kiroku API")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CitationRequest(BaseModel):
    url: Optional[str] = None
    doi: Optional[str] = None
    isbn: Optional[str] = None

class CitationResponse(BaseModel):
    title: str
    authors: List[str]
    year: Optional[int]
    publisher: Optional[str]
    source: str

@app.get("/")
def read_root():
    return {"message": "Welcome to Eien-no-Kiroku API - The Eternal Record"}

@app.post("/extract", response_model=CitationResponse)
async def extract_metadata(request: CitationRequest):
    if request.doi:
        # Real Crossref API call
        try:
            url = f"https://api.crossref.org/works/{request.doi}"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()["message"]
                authors = [f"{a.get('given', '')} {a.get('family', '')}".strip() for a in data.get("author", [])]
                year = data.get("issued", {}).get("date-parts", [[None]])[0][0]
                return {
                    "title": data.get("title", ["Unknown Title"])[0],
                    "authors": authors or ["Unknown Author"],
                    "year": year,
                    "publisher": data.get("publisher", "Unknown Publisher"),
                    "source": "Crossref"
                }
            else:
                raise HTTPException(status_code=404, detail="DOI not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    if request.isbn:
        # Placeholder for Google Books
        return {
            "title": f"Book Search for ISBN {request.isbn}",
            "authors": ["ISBN Logic Needed"],
            "year": 2024,
            "publisher": "Google Books (Simulated)",
            "source": "ISBN Engine"
        }

    raise HTTPException(status_code=400, detail="Must provide DOI, ISBN, or URL")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
