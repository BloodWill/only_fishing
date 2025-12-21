from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.database import engine
from backend import models
from backend.routers import fish, catches, species, admin_migrate, stats
from backend.routers import predict as predict_router

app = FastAPI(title="Fishing App API")

# Create tables
models.Base.metadata.create_all(bind=engine)

# CORS
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
# 修复：移除重复的 species router 注册，只保留下面这一行带 prefix 的
app.include_router(species.router,  prefix="/species", tags=["species"])

app.include_router(admin_migrate.router)
app.include_router(stats.router)
app.include_router(predict_router.router)