from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from sqlalchemy.orm import Session
import uuid, os, logging

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

@router.post("/identify")
async def identify_fish(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Basic content-type & size checks
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

    # Save image
    uid = uuid.uuid4().hex
    ext = EXT_FOR[file.content_type]
    filename = uid + ext
    rel_path = f"/assets/uploads/{filename}"
    abs_path = os.path.join(SAVE_DIR, filename)

    with open(abs_path, "wb") as f:
        f.write(contents)
    logger.info("Saved upload: %s", abs_path)

    # Inference
    result = predict.run_inference(contents)
    label = result.get("label") or "Unknown"
    conf = float(result.get("confidence") or 0.0)

    # TODO: replace None with real user id from auth
    user_id = None

    # Create Catch
    catch = models.Catch(
        image_path=rel_path,
        species_label=label,
        species_confidence=conf,
        user_id=user_id
    )
    db.add(catch)
    db.flush()   # get catch.id before commit

    # If we know which user this belongs to, upsert UserSpecies
    if user_id and label:
        # Find or create Species row by common_name (case-insensitive)
        sp = (
            db.query(models.Species)
            .filter(models.Species.common_name.ilike(label))
            .first()
        )
        if sp is None:
            sp = models.Species(common_name=label)
            db.add(sp)
            db.flush()  # get sp.id

        # Upsert link
        link = (
            db.query(models.UserSpecies)
            .filter_by(user_id=user_id, species_id=sp.id)
            .first()
        )
        if link is None:
            db.add(models.UserSpecies(user_id=user_id, species_id=sp.id))

    db.commit()
    db.refresh(catch)

    return {
        "file_name": file.filename,
        "saved_path": rel_path,
        "content_type": file.content_type,
        "prediction": result,
        "catch_id": catch.id,
        "created_at": catch.created_at.isoformat()
    }
