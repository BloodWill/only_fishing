# backend/routers/fish.py
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import uuid, os, logging, json
import httpx
from typing import Optional

from backend.database import get_db
from backend import models
from ml import predict  # keeping your import as-is

router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 6 * 1024 * 1024  # 6 MB
SAVE_DIR = os.path.join("assets", "uploads")
os.makedirs(SAVE_DIR, exist_ok=True)

EXT_FOR = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}

async def fetch_weather(lat: float, lng: float) -> Optional[dict]:
    """Minimal current-conditions snapshot via Open-Meteo."""
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code"
        )
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url)
            if r.status_code == 200:
                return r.json()
            logger.warning("weather fetch non-200: %s %s", r.status_code, r.text[:200])
    except Exception as e:
        logger.warning("weather fetch failed: %s", e)
    return None

@router.post("/identify")
async def identify_fish(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),    # optional login
    persist: bool = Form(True),             # allow client to skip server persistence
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
):
    # Basic validation
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type: {file.content_type}"
        )
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large (> {MAX_BYTES//(1024*1024)} MB)"
        )

    # Inference first (works whether or not we persist)
    result = predict.run_inference(contents)
    label = (result.get("label") or "Unknown").strip()
    conf = float(result.get("confidence") or 0.0)

    # If not logged-in or client asked not to persist: don't save to DB/disk
    if not user_id or not persist:
        return {
            "file_name": file.filename,
            "content_type": file.content_type,
            "prediction": result,
            "saved_path": None,
            "catch_id": None,
            "created_at": None,
            "lat": latitude,
            "lng": longitude,
            "weather": None,
        }

    # Persist image to disk
    try:
        uid = uuid.uuid4().hex
        ext = EXT_FOR[file.content_type]
        filename = uid + ext
        rel_path = f"/assets/uploads/{filename}"
        abs_path = os.path.join(SAVE_DIR, filename)
        with open(abs_path, "wb") as f:
            f.write(contents)
        logger.info("Saved upload: %s", abs_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write image: {e}")

    # Optional weather snapshot if we have geo
    weather = None
    if latitude is not None and longitude is not None:
        weather = await fetch_weather(latitude, longitude)

    # Create Catch row (requires lat/lng/weather_json columns in models + DB)
    try:
        catch = models.Catch(
            image_path=rel_path,
            species_label=label,
            species_confidence=conf,
            user_id=user_id,
            lat=latitude,
            lng=longitude,
            weather_json=json.dumps(weather) if weather else None,
        )
        db.add(catch)
        db.flush()   # get catch.id before commit

        # Upsert Species + UserSpecies (so Collection updates immediately)
        if label:
            sp = (
                db.query(models.Species)
                .filter(models.Species.common_name.ilike(label))
                .first()
            )
            if sp is None:
                sp = models.Species(common_name=label)
                db.add(sp)
                db.flush()  # get sp.id

            link = (
                db.query(models.UserSpecies)
                .filter_by(user_id=user_id, species_id=sp.id)
                .first()
            )
            if link is None:
                db.add(models.UserSpecies(user_id=user_id, species_id=sp.id))

        db.commit()
        db.refresh(catch)
    except SQLAlchemyError as e:
        db.rollback()
        # Common cause during upgrade: missing columns (lat/lng/weather_json)
        # This will return JSON like {"detail":"DB error ... no such column: catches.lat"}
        raise HTTPException(status_code=500, detail=f"DB error during identify: {e.__class__.__name__}: {e}")

    return {
        "file_name": file.filename,
        "saved_path": rel_path,
        "content_type": file.content_type,
        "prediction": result,
        "catch_id": catch.id,
        "created_at": catch.created_at.isoformat(),
        "lat": catch.lat,
        "lng": catch.lng,
        "weather": weather,
    }
