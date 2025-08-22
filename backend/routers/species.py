# backend/routers/species.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend import models, schemas

router = APIRouter(prefix="/species", tags=["species"])

@router.get("/", response_model=List[schemas.SpeciesRead])
def list_species(db: Session = Depends(get_db)):
    return db.query(models.Species).order_by(models.Species.common_name.asc()).all()

@router.get("/users/{user_id}/collection", response_model=schemas.UserCollectionRead)
def user_collection(user_id: str, db: Session = Depends(get_db)):
    # All species
    all_species = db.query(models.Species).order_by(models.Species.common_name.asc()).all()
    # Map of caught species_id -> first_catch_at
    rows = db.query(models.UserSpecies).filter(models.UserSpecies.user_id == user_id).all()
    caught_map = {r.species_id: r.first_catch_at for r in rows}

    entries: List[schemas.CollectionEntry] = []
    caught_count = 0
    for sp in all_species:
        caught = sp.id in caught_map
        if caught:
            caught_count += 1
        entries.append(
            schemas.CollectionEntry(
                id=sp.id,
                common_name=sp.common_name,
                sci_name=sp.sci_name,
                icon_path=sp.icon_path,
                caught=caught,
                first_catch_at=caught_map.get(sp.id),
            )
        )
    return schemas.UserCollectionRead(
        user_id=user_id,
        total=len(all_species),
        caught=caught_count,
        species=entries,
    )

# (Optional) Dev-only seed endpoint: add a few species
@router.post("/seed", response_model=List[schemas.SpeciesRead])
def seed_species(db: Session = Depends(get_db)):
    seed = [
        dict(common_name="Largemouth Bass", sci_name="Micropterus salmoides", icon_path="/assets/icons/largemouth_bass.png"),
        dict(common_name="Smallmouth Bass", sci_name="Micropterus dolomieu", icon_path="/assets/icons/smallmouth_bass.png"),
        dict(common_name="Rainbow Trout", sci_name="Oncorhynchus mykiss", icon_path="/assets/icons/rainbow_trout.png"),
        dict(common_name="Bluegill", sci_name="Lepomis macrochirus", icon_path="/assets/icons/bluegill.png"),
    ]
    out = []
    for sp in seed:
        obj = db.query(models.Species).filter(models.Species.common_name.ilike(sp["common_name"])).first()
        if not obj:
            obj = models.Species(**sp)
            db.add(obj)
            db.flush()
        out.append(obj)
    db.commit()
    return out
