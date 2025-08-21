from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend import models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.CatchRead])
def list_catches(db: Session = Depends(get_db), limit: int = 50, offset: int = 0):
    q = db.query(models.Catch).order_by(models.Catch.id.desc()).offset(offset).limit(limit)
    return q.all()

@router.get("/{catch_id}", response_model=schemas.CatchRead)
def get_catch(catch_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.Catch).get(catch_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Catch not found")
    return obj
