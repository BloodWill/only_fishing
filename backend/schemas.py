# backend/schemas.py
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

# --- Catch Schemas ---

class CatchBase(BaseModel):
    species_label: Optional[str] = None
    species_confidence: Optional[float] = None

class CatchCreate(CatchBase):
    image_path: str
    user_id: Optional[str] = None

class CatchUpdate(CatchBase):
    pass

class CatchRead(CatchBase):
    id: int
    image_path: str
    species_label: Optional[str] = None
    species_confidence: Optional[float] = None
    created_at: datetime
    user_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    weather_json: Optional[str] = None  # Raw JSON string

    class Config:
        from_attributes = True

# --- Species Schemas ---

class SpeciesRead(BaseModel):
    id: int
    common_name: str
    sci_name: Optional[str] = None
    icon_path: Optional[str] = None
    
    # ✅ 新增字段，暴露给前端
    rarity: Optional[str] = None
    activity: Optional[str] = None
    points: Optional[int] = None
    description: Optional[str] = None
    habitat: Optional[str] = None
    best_time: Optional[str] = None
    avg_size: Optional[str] = None
    bait: Optional[str] = None
    difficulty: Optional[str] = None

    class Config:
        from_attributes = True

# --- User Collection Schemas ---

class CollectionEntry(BaseModel):
    id: int
    common_name: str
    sci_name: Optional[str] = None
    icon_path: Optional[str] = None
    
    # Collection status
    caught: bool
    first_catch_at: Optional[datetime] = None

class UserCollectionRead(BaseModel):
    user_id: str
    total: int
    caught: int
    species: List[CollectionEntry]