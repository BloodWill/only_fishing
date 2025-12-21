# backend/services/catch_service.py
#
# ============== CHANGES FROM ORIGINAL ==============
# 1. Line 55-66: Use db.begin_nested() savepoints instead of db.rollback()
#    This prevents rolling back the entire Catch when Species insert fails
# 2. Line 75-83: Same savepoint fix for UserSpecies
# ===================================================

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from typing import Optional
import json
import logging
from datetime import datetime

from backend import models

logger = logging.getLogger(__name__)

def create_catch(
    db: Session,
    user_id: Optional[str],
    image_path: str,
    species_label: str,
    species_confidence: float,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    weather_data: Optional[dict] = None
) -> models.Catch:
    """
    核心业务逻辑：创建一条捕获记录
    1. 写入 Catch 表
    2. 自动维护 Species 表 (并发安全)
    3. 自动维护 UserSpecies 表 (点亮用户图鉴)
    """
    try:
        # 1. 创建 Catch 记录
        catch = models.Catch(
            image_path=image_path,
            species_label=species_label,
            species_confidence=species_confidence,
            user_id=user_id,
            lat=lat,
            lng=lng,
            weather_json=json.dumps(weather_data) if weather_data else None,
            created_at=datetime.utcnow()
        )
        db.add(catch)
        db.flush() # 获取 catch.id

        # 2. 自动维护 Species 表
        if species_label and species_label.strip() and species_label.lower() != "unknown":
            # 先尝试查询
            sp = db.query(models.Species).filter(
                models.Species.common_name.ilike(species_label)
            ).first()
            
            if sp is None:
                # ============== FIX: Use savepoint ==============
                # BEFORE: db.rollback() would rollback the ENTIRE transaction
                #         including the Catch record we just created!
                # AFTER:  db.begin_nested() creates a SAVEPOINT, so only
                #         the Species insert is rolled back on conflict
                try:
                    with db.begin_nested():  # SAVEPOINT
                        sp = models.Species(common_name=species_label)
                        db.add(sp)
                        db.flush()
                except IntegrityError:
                    # Another request created it first - just fetch it
                    # The savepoint was rolled back, but our Catch is safe!
                    sp = db.query(models.Species).filter(
                        models.Species.common_name.ilike(species_label)
                    ).first()
                # ================================================

            # 3. 只有已登录用户才关联 UserSpecies (点亮图鉴)
            if user_id and sp:
                link = db.query(models.UserSpecies).filter_by(
                    user_id=user_id, 
                    species_id=sp.id
                ).first()
                
                if link is None:
                    # ============== FIX: Use savepoint ==============
                    try:
                        with db.begin_nested():  # SAVEPOINT
                            db.add(models.UserSpecies(user_id=user_id, species_id=sp.id))
                            db.flush()
                    except IntegrityError:
                        # Link already exists from concurrent request - that's fine
                        pass
                    # ================================================

        db.commit()
        db.refresh(catch)
        return catch

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error creating catch: {e}")
        raise e
