# backend/routers/catches.py

from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path

from backend.database import get_db
from backend import models, schemas
from backend.storage import delete_image, is_supabase_url
from backend.auth import AuthenticatedUser, get_current_user, get_optional_user

router = APIRouter()
UPLOADS_DIR = Path("assets/uploads").resolve()


@router.get("/", response_model=List[schemas.CatchRead])
async def list_catches(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
    offset: int = 0,
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
    mine_only: bool = False  # 新增参数，允许前端显式请求“我的鱼获”
):
    """
    List catches. 
    - By default, returns recent catches (Community Feed).
    - If mine_only=True, returns only authenticated user's catches.
    """
    q = db.query(models.Catch).order_by(models.Catch.id.desc())
    
    if mine_only:
        if not user:
            raise HTTPException(status_code=401, detail="Authentication required to view your catches")
        q = q.filter(models.Catch.user_id == user.id)
    
    # 这里我们移除了原来的逻辑： "if user: filter(user_id)". 
    # 原逻辑会导致登录用户无法查看广场数据。现在由 mine_only 控制。
    
    return q.offset(offset).limit(limit).all()


@router.get("/me", response_model=List[schemas.CatchRead])
async def list_my_catches(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
    offset: int = 0,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Shortcut endpoint for authenticated user's catches.
    """
    q = db.query(models.Catch).filter(
        models.Catch.user_id == user.id
    ).order_by(models.Catch.id.desc())
    
    return q.offset(offset).limit(limit).all()


@router.get("/{catch_id}", response_model=schemas.CatchRead)
async def get_catch(
    catch_id: int,
    db: Session = Depends(get_db),
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
):
    """
    Get a specific catch by ID.
    Access Control:
    - If the catch has a user_id (Private/User owned), only the owner can view it.
    - (ADJUSTMENT: If you want all catches to be public read, remove the 403 block below)
    """
    obj = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Catch not found")
    
    # --- 安全修复 ---
    # 如果记录归属于某个用户
    if obj.user_id:
        # 且 (当前未登录 OR 当前登录用户不是该记录拥有者)
        if not user or obj.user_id != user.id:
            # 拒绝访问
            # 注意：如果你希望做成社交应用（人人可看），请注释掉下面两行
            raise HTTPException(status_code=403, detail="Forbidden: This catch is private")
    # ----------------
    
    return obj


def _apply_update_and_upsert(obj: models.Catch, payload: schemas.CatchUpdate, db: Session):
    """Helper to apply updates and upsert species"""
    changed_label = False
    if payload.species_label is not None:
        new_label = (payload.species_label or "").strip()
        if new_label and new_label != obj.species_label:
            obj.species_label = new_label
            changed_label = True
    if payload.species_confidence is not None:
        obj.species_confidence = float(payload.species_confidence)

    # 如果修改了鱼种标签，自动更新图鉴
    if changed_label and obj.user_id and obj.species_label:
        sp = db.query(models.Species).filter(models.Species.common_name.ilike(obj.species_label)).first()
        if sp is None:
            # 简单处理，更完善的处理在 catch_service 中
            sp = models.Species(common_name=obj.species_label)
            db.add(sp)
            db.flush()
            
        link = db.query(models.UserSpecies).filter_by(user_id=obj.user_id, species_id=sp.id).first()
        if link is None:
            db.add(models.UserSpecies(user_id=obj.user_id, species_id=sp.id))


@router.patch("/{catch_id}", response_model=schemas.CatchRead)
async def update_catch(
    catch_id: int,
    payload: schemas.CatchUpdate = Body(...),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Update a catch. Only owner can update.
    """
    obj = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Catch not found")
    
    if obj.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden - not your catch")

    _apply_update_and_upsert(obj, payload, db)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{catch_id}", response_model=schemas.CatchRead)
async def update_catch_put(
    catch_id: int,
    payload: schemas.CatchUpdate = Body(...),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    return await update_catch(catch_id, payload, db, user)


@router.delete("/{catch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_catch(
    catch_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete a catch. Only owner can delete.
    """
    catch = db.query(models.Catch).filter(models.Catch.id == catch_id).first()
    if catch is None:
        raise HTTPException(status_code=404, detail="Catch not found")
    
    if catch.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden - not your catch")

    # Delete image logic
    if catch.image_path:
        if is_supabase_url(catch.image_path):
            delete_image(catch.image_path)
        else:
            rel = catch.image_path.lstrip("/")
            candidate = Path(rel).resolve()
            try:
                if candidate.is_file() and UPLOADS_DIR in candidate.parents:
                    candidate.unlink(missing_ok=True)
            except Exception:
                pass

    db.delete(catch)
    db.commit()