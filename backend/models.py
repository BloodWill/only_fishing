from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from backend.database import Base

class Catch(Base):
    __tablename__ = "catches"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)           # e.g., "/assets/uploads/<uuid>.jpg"
    species_label = Column(String, nullable=False)        # model top-1 label
    species_confidence = Column(Float, nullable=False)    # model top-1 confidence (0..1)
    user_id = Column(String, nullable=True)               # TODO: wire real auth later
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
