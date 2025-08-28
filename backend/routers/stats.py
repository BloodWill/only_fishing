# backend/routers/stats.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict

from backend.database import get_db
from backend import models

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/users-unique-species")
def users_unique_species(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=1000),
) -> List[Dict[str, int]]:
    """
    Leaderboard: users ranked by count of unique species they've collected.
    Uses user_species (already maintained on create/update).
    """
    q = (
        db.query(
            models.UserSpecies.user_id.label("user_id"),
            func.count(func.distinct(models.UserSpecies.species_id)).label("uniq_species_count"),
        )
        .group_by(models.UserSpecies.user_id)
        .order_by(func.count(func.distinct(models.UserSpecies.species_id)).desc())
        .limit(limit)
    )
    rows = q.all()
    return [
        {"user_id": r.user_id, "uniq_species_count": int(r.uniq_species_count)}
        for r in rows
    ]
