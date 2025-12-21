# backend/services/catch_service.py

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
        if species_label and species_label != "Unknown":
            # 先尝试查询
            sp = db.query(models.Species).filter(
                models.Species.common_name.ilike(species_label)
            ).first()
            
            if sp is None:
                try:
                    # 尝试创建
                    # 注意：如果两个请求同时到这里，第二个会触发 Unique Constraint 错误
                    sp = models.Species(common_name=species_label)
                    db.add(sp)
                    db.flush()
                except IntegrityError:
                    # 捕获竞争条件错误，回滚子事务，重新查询即可
                    db.rollback()
                    sp = db.query(models.Species).filter(
                        models.Species.common_name.ilike(species_label)
                    ).first()

            # 3. 只有已登录用户才关联 UserSpecies (点亮图鉴)
            if user_id and sp:
                # 同样的逻辑，防止 UserSpecies 重复
                link = db.query(models.UserSpecies).filter_by(
                    user_id=user_id, 
                    species_id=sp.id
                ).first()
                
                if link is None:
                    try:
                        db.add(models.UserSpecies(user_id=user_id, species_id=sp.id))
                        db.flush()
                    except IntegrityError:
                        db.rollback()
                        # 已经存在了，忽略即可
                        pass

        db.commit()
        db.refresh(catch)
        return catch

    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error creating catch: {e}")
        raise e