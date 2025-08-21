from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.routers import fish

from backend.routers import catches
from backend.database import engine
from backend import models

app = FastAPI(title="Fishing App API")

# Create tables (simple approach; Alembic recommended later)
models.Base.metadata.create_all(bind=engine)

# CORS (loose for dev; tighten allow_origins later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Fishing App Backend is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# Serve static files
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
def root():
    return {"message": "Fishing App Backend is running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# Routers
app.include_router(fish.router, prefix="/fish", tags=["fish"])
app.include_router(catches.router, prefix="/catches", tags=["catches"])



