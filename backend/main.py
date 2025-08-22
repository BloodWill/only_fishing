from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import engine
from backend import models
from backend.routers import fish, catches, species

app = FastAPI(title="Fishing App API")

# Create tables (simple; move to Alembic later)
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

# Static files
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

# Routers
app.include_router(fish.router, prefix="/fish", tags=["fish"])
app.include_router(catches.router, prefix="/catches", tags=["catches"])
app.include_router(species.router)  # /species/*
