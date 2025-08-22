from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CatchUpdate(BaseModel):
    species_label: Optional[str] = None
    species_confidence: Optional[float] = None

class CatchBase(BaseModel):
    image_path: str
    species_label: str
    species_confidence: float
    user_id: Optional[str] = None

class CatchRead(CatchBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2

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
