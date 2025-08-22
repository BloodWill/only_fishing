# backend/routers/catches.py
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List
from pathlib import Path

from backend.database import get_db
from backend import models, schemas

router = APIRouter()

UPLOADS_DIR = Path("assets/uploads").resolve()

@router.get("/", response_model=List[schemas.CatchRead])
def list_catches(db: Session = Depends(get_db), limit: int = 50, offset: int = 0):
    return (
        db.query(models.Catch)
        .order_by(models.Catch.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

@router.get("/{catch_id}", response_model=schemas.CatchRead)
def get_catch(catch_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Catch not found")
    return obj

@router.patch("/{catch_id}", response_model=schemas.CatchRead)
def update_catch(
    catch_id: int,
    payload: schemas.CatchUpdate = Body(...),
    db: Session = Depends(get_db),
):
    obj = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Catch not found")

    if payload.species_label is not None:
        obj.species_label = payload.species_label
    if payload.species_confidence is not None:
        obj.species_confidence = payload.species_confidence

    db.commit()
    db.refresh(obj)
    return obj

# ✅ PUT fallback for environments/proxies that block PATCH
@router.put("/{catch_id}", response_model=schemas.CatchRead)
def update_catch_put(
    catch_id: int,
    payload: schemas.CatchUpdate = Body(...),
    db: Session = Depends(get_db),
):
    return update_catch(catch_id, payload, db)

@router.delete("/{catch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_catch(catch_id: int, db: Session = Depends(get_db)):
    catch = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if catch is None:
        raise HTTPException(status_code=404, detail="Catch not found")

    # Best-effort delete the image file within assets/uploads
    if catch.image_path:
        rel = catch.image_path.lstrip("/")
        candidate = Path(rel).resolve()
        try:
            if candidate.is_file() and UPLOADS_DIR in candidate.parents:
                candidate.unlink(missing_ok=True)
        except Exception:
            pass

    db.delete(catch)
    db.commit()
    # 204 No Content
