from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import requests

app = FastAPI(title="Eien-no-Kiroku API")

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
    # Placeholder for logic
    if request.doi:
        # Crossref logic here
        return {
            "title": "Sample Title for DOI " + request.doi,
            "authors": ["Author One", "Author Two"],
            "year": 2024,
            "publisher": "Eternal Press",
            "source": "Crossref"
        }
    
    raise HTTPException(status_code=400, detail="Must provide DOI, ISBN, or URL")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
