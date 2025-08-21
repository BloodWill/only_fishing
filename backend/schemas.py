from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CatchBase(BaseModel):
    image_path: str
    species_label: str
    species_confidence: float
    user_id: Optional[str] = None

class CatchRead(CatchBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True  # Pydantic v2: ORM mode
