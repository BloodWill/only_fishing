# backend/routers/admin_migrate.py
from fastapi import APIRouter, Depends
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from backend.database import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/migrate_geo_weather")
def migrate(db: Session = Depends(get_db)):
    insp = inspect(db.bind)
    cols = {c["name"] for c in insp.get_columns("catches")}
    added = []
    if "lat" not in cols:
        db.execute(text("ALTER TABLE catches ADD COLUMN lat REAL"))
        added.append("lat")
    if "lng" not in cols:
        db.execute(text("ALTER TABLE catches ADD COLUMN lng REAL"))
        added.append("lng")
    if "weather_json" not in cols:
        db.execute(text("ALTER TABLE catches ADD COLUMN weather_json TEXT"))
        added.append("weather_json")
    db.commit()
    return {"added": added}
