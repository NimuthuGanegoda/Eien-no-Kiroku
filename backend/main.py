import os
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import requests
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Eien-no-Kiroku API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Setup (To be configured with user's credentials)
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

security = HTTPBearer()

async def get_current_user(token: HTTPAuthorizationCredentials = Security(security)):
    if not supabase:
        return {"id": "demo-user"}
    try:
        user = supabase.auth.get_user(token.credentials)
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

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
    idType: Optional[str]
    idValue: Optional[str]

class UserAuth(BaseModel):
    email: str
    password: str

@app.get("/")
def read_root():
    return {"message": "Welcome to Eien-no-Kiroku API - The Eternal Record"}

@app.post("/register")
async def register(auth: UserAuth):
    if not supabase:
        raise HTTPException(status_code=501, detail="Supabase not configured")
    try:
        res = supabase.auth.sign_up({"email": auth.email, "password": auth.password})
        return {"message": "Registration successful", "user": res.user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(auth: UserAuth):
    if not supabase:
        raise HTTPException(status_code=501, detail="Supabase not configured")
    try:
        res = supabase.auth.sign_in_with_password({"email": auth.email, "password": auth.password})
        return {"access_token": res.session.access_token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/extract", response_model=CitationResponse)
async def extract_metadata(request: CitationRequest):
    # Enhanced extraction logic
    if request.doi:
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
                    "source": "Crossref",
                    "idType": "doi",
                    "idValue": request.doi
                }
            else:
                raise HTTPException(status_code=404, detail="DOI not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    if request.isbn:
        try:
            url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{request.isbn}"
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("totalItems", 0) > 0:
                    item = data["items"][0]["volumeInfo"]
                    return {
                        "title": item.get("title", "Unknown Title"),
                        "authors": item.get("authors", ["Unknown Author"]),
                        "year": int(item.get("publishedDate", "0").split("-")[0]) if item.get("publishedDate") else None,
                        "publisher": item.get("publisher", "Unknown Publisher"),
                        "source": "Google Books",
                        "idType": "isbn",
                        "idValue": request.isbn
                    }
            raise HTTPException(status_code=404, detail="ISBN not found")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=400, detail="Must provide DOI, ISBN, or URL")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
