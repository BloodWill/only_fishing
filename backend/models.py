# backend/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.sql import func
from backend.database import Base
from sqlalchemy.orm import relationship
from datetime import datetime

class Catch(Base):
    __tablename__ = "catches"

    id = Column(Integer, primary_key=True, index=True)
    image_path = Column(String, nullable=False)
    species_label = Column(String, nullable=False)
    species_confidence = Column(Float, nullable=False)
    user_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # 地理位置
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    
    # 天气快照 (JSON string)
    weather_json = Column(Text, nullable=True)

class Species(Base):
    __tablename__ = "species"

    id = Column(Integer, primary_key=True, index=True)
    common_name = Column(String, unique=True, index=True, nullable=False)
    sci_name = Column(String, nullable=True)
    icon_path = Column(String, nullable=True) # 可以存 emoji 🐟 或图片 URL

    # ✅ 新增：整合前端 fishData.ts 的丰富字段
    # 使用 nullable=True 或 default 以兼容旧数据
    rarity = Column(String, default="Common")      # e.g. "Rare", "Epic"
    activity = Column(String, default="Medium")    # e.g. "High"
    points = Column(Integer, default=10)           # e.g. 50
    description = Column(Text, nullable=True)
    habitat = Column(String, nullable=True)
    best_time = Column(String, nullable=True)
    avg_size = Column(String, nullable=True)
    bait = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)     # e.g. "beginner"

    # 反向关联
    users = relationship("UserSpecies", back_populates="species", cascade="all, delete-orphan")

class UserSpecies(Base):
    __tablename__ = "user_species"
    
    user_id = Column(String, primary_key=True)
    species_id = Column(Integer, ForeignKey("species.id"), primary_key=True)
    first_catch_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    species = relationship("Species", back_populates="users")

    # 确保每个用户对每种鱼只有一条记录
    __table_args__ = (
        UniqueConstraint("user_id", "species_id", name="uq_user_species"),
    )