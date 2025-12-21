from fastapi import APIRouter, Depends, HTTPException, status, Body, Header, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path

from backend.database import get_db
from backend import models, schemas
from backend.storage import delete_image, is_supabase_url  # NEW: Supabase storage

router = APIRouter()
UPLOADS_DIR = Path("assets/uploads").resolve()


@router.get("/", response_model=List[schemas.CatchRead])
def list_catches(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
    offset: int = 0,
    user_id: Optional[str] = Query(None, description="If provided, only return catches for this user"),
):
    q = db.query(models.Catch).order_by(models.Catch.id.desc())
    if user_id:
        q = q.filter(models.Catch.user_id == user_id)
    return q.offset(offset).limit(limit).all()


@router.get("/{catch_id}", response_model=schemas.CatchRead)
def get_catch(
    catch_id: int,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, convert_underscores=False),
):
    obj = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Catch not found")
    if x_user_id is not None and obj.user_id and obj.user_id != x_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return obj


def _apply_update_and_upsert(obj: models.Catch, payload: schemas.CatchUpdate, db: Session):
    changed_label = False
    if payload.species_label is not None:
        new_label = (payload.species_label or "").strip()
        if new_label and new_label != obj.species_label:
            obj.species_label = new_label
            changed_label = True
    if payload.species_confidence is not None:
        obj.species_confidence = float(payload.species_confidence)

    if changed_label and obj.user_id and obj.species_label:
        sp = db.query(models.Species).filter(models.Species.common_name.ilike(obj.species_label)).first()
        if sp is None:
            sp = models.Species(common_name=obj.species_label)
            db.add(sp)
            db.flush()
        link = db.query(models.UserSpecies).filter_by(user_id=obj.user_id, species_id=sp.id).first()
        if link is None:
            db.add(models.UserSpecies(user_id=obj.user_id, species_id=sp.id))


@router.patch("/{catch_id}", response_model=schemas.CatchRead)
def update_catch(
    catch_id: int,
    payload: schemas.CatchUpdate = Body(...),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, convert_underscores=False),
):
    obj = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Catch not found")
    if x_user_id is not None and obj.user_id and obj.user_id != x_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    _apply_update_and_upsert(obj, payload, db)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{catch_id}", response_model=schemas.CatchRead)
def update_catch_put(
    catch_id: int,
    payload: schemas.CatchUpdate = Body(...),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, convert_underscores=False),
):
    return update_catch(catch_id, payload, db, x_user_id)


@router.delete("/{catch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_catch(
    catch_id: int,
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, convert_underscores=False),
):
    catch = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if catch is None:
        raise HTTPException(status_code=404, detail="Catch not found")
    if x_user_id is not None and catch.user_id and catch.user_id != x_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Delete image - handle both Supabase URLs and local paths
    if catch.image_path:
        if is_supabase_url(catch.image_path):
            # Delete from Supabase Storage
            delete_image(catch.image_path)
        else:
            # Delete from local storage (legacy/fallback)
            rel = catch.image_path.lstrip("/")
            candidate = Path(rel).resolve()
            try:
                if candidate.is_file() and UPLOADS_DIR in candidate.parents:
                    candidate.unlink(missing_ok=True)
            except Exception:
                pass

    db.delete(catch)
    db.commit()
