from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from backend.database import Base
from sqlalchemy.orm import relationship
from datetime import datetime

class Catch(Base):
    __tablename__ = "catches"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)           # e.g., "/assets/uploads/<uuid>.jpg"
    species_label = Column(String, nullable=False)        # model top-1 label
    species_confidence = Column(Float, nullable=False)    # model top-1 confidence (0..1)
    user_id = Column(String, nullable=True)               # TODO: wire real auth later
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Species(Base):
    __tablename__ = "species"
    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String, unique=True, index=True, nullable=False)   # e.g., "Largemouth Bass"
    sci_name = Column(String, nullable=True)                                # optional
    icon_path = Column(String, nullable=True)                                # e.g., "/assets/icons/bass.png"

    # reverse lookups if needed
    users = relationship("UserSpecies", back_populates="species", cascade="all, delete-orphan")

class UserSpecies(Base):
    __tablename__ = "user_species"
    user_id = Column(String, primary_key=True)       # align with your app's notion of user
    species_id = Column(Integer, ForeignKey("species.id"), primary_key=True)
    first_catch_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    species = relationship("Species", back_populates="users")

    __table_args__ = (
        UniqueConstraint("user_id", "species_id", name="uq_user_species"),
    )