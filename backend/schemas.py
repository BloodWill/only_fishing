from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class CatchUpdate(BaseModel):
    species_label: Optional[str] = None
    species_confidence: Optional[float] = None
    # allow patching geo if you want
    lat: Optional[float] = None
    lng: Optional[float] = None

class CatchBase(BaseModel):
    image_path: str
    species_label: str
    species_confidence: float
    user_id: Optional[str] = None

class CatchRead(BaseModel):
    id: int
    image_path: str
    species_label: Optional[str] = None
    species_confidence: float
    created_at: datetime
    user_id: Optional[str] = None
    # 🆕
    lat: Optional[float] = None
    lng: Optional[float] = None
    weather_json: Optional[Any] = None
    class Config:
        orm_mode = True

class SpeciesRead(BaseModel):
    id: int
    common_name: str
    sci_name: Optional[str] = None
    icon_path: Optional[str] = None

    class Config:
        from_attributes = True  # <- change from orm_mode to v2 style

class CollectionEntry(BaseModel):
    id: int
    common_name: str
    sci_name: Optional[str] = None
    icon_path: Optional[str] = None
    caught: bool
    first_catch_at: Optional[datetime] = None

class UserCollectionRead(BaseModel):
    user_id: str
    total: int
    caught: int
    species: List[CollectionEntry]
