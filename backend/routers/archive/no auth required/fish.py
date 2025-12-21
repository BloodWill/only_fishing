# backend/routers/fish.py
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import uuid, os, logging, json
import httpx
from typing import Optional

from backend.database import get_db
from backend import models
from backend.storage import upload_image  # NEW: Supabase storage
from ml import predict

router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 6 * 1024 * 1024  # 6 MB

# Local storage fallback (used if Supabase not configured)
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


def save_image_local(contents: bytes, content_type: str) -> str:
    """Fallback: save image to local disk"""
    uid = uuid.uuid4().hex
    ext = EXT_FOR[content_type]
    filename = uid + ext
    rel_path = f"/assets/uploads/{filename}"
    abs_path = os.path.join(SAVE_DIR, filename)
    with open(abs_path, "wb") as f:
        f.write(contents)
    logger.info("Saved upload locally: %s", abs_path)
    return rel_path


@router.post("/identify")
async def identify_fish(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
    persist: bool = Form(True),
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

    # ===== IMAGE STORAGE =====
    # Try Supabase first, fall back to local storage
    try:
        image_url = upload_image(contents, file.content_type)
        if image_url:
            rel_path = image_url  # Supabase URL
            logger.info("Uploaded to Supabase Storage: %s", image_url)
        else:
            # Supabase not configured, use local storage
            rel_path = save_image_local(contents, file.content_type)
    except Exception as e:
        logger.warning("Supabase upload failed, using local: %s", e)
        rel_path = save_image_local(contents, file.content_type)

    # Optional weather snapshot if we have geo
    weather = None
    if latitude is not None and longitude is not None:
        weather = await fetch_weather(latitude, longitude)

    # Create Catch row
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
        db.flush()

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
                db.flush()

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
