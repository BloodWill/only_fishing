from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from sqlalchemy.orm import Session
from ml import predict
import uuid, os, logging

from backend.database import get_db
from backend import models

router = APIRouter()

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 6 * 1024 * 1024  # 6 MB
SAVE_DIR = os.path.join("assets", "uploads")
os.makedirs(SAVE_DIR, exist_ok=True)

@router.post("/identify")
async def identify_fish(file: UploadFile = File(...), db: Session = Depends(get_db)):
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
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp"
    }[file.content_type]
    rel_path = f"/assets/uploads/{uid}{ext}"
    abs_path = os.path.join(SAVE_DIR, uid + ext)

    with open(abs_path, "wb") as f:
        f.write(contents)
    logger.info(f"Saved upload: {abs_path}")

    # Inference
    result = predict.run_inference(contents)
    label = result["label"]
    conf = float(result.get("confidence", 0.0))

    # TODO: wire real user_id from auth; for now, leave None or a fixed test id
    catch = models.Catch(
        image_path=rel_path,
        species_label=label,
        species_confidence=conf,
        user_id=None
    )
    db.add(catch)
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
