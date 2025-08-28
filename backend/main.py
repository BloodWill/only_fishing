from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import engine
from backend import models
from backend.routers import fish, catches, species
from backend.routers import admin_migrate  # + existing imports
# at top with other routers
from backend.routers import stats
from .routers import predict as predict_router



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
app.include_router(species.router,  prefix="/species", tags=["species"])
app.include_router(species.router)  # /species/*
app.include_router(admin_migrate.router)
# where routers are included
app.include_router(stats.router)  # exposes /stats/users-unique-species
app.include_router(predict_router.router)