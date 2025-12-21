# backend/routers/fish.py
# Refactored to use Service Layer (catch_service)
# Removes direct DB logic from the router

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form
from sqlalchemy.orm import Session
from typing import Optional
import logging
import httpx
import os
import uuid

from backend.database import get_db
from backend.storage import upload_image
from backend.auth import AuthenticatedUser, get_current_user, get_optional_user
from backend.services import catch_service  # ✅ 引入新的 Service
from ml import predict

router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 6 * 1024 * 1024  # 6 MB

# Local storage fallback config
SAVE_DIR = os.path.join("assets", "uploads")
os.makedirs(SAVE_DIR, exist_ok=True)
EXT_FOR = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


# --- Helper Functions (可以考虑未来移入 utils 或 weather_service) ---

async def fetch_weather(lat: float, lng: float) -> Optional[dict]:
    """Minimal current-conditions snapshot via Open-Meteo."""
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code"
        )
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(url)
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.warning("Weather fetch failed: %s", e)
    return None

def save_image_local(contents: bytes, content_type: str) -> str:
    """Fallback: save image to local disk"""
    uid = uuid.uuid4().hex
    ext = EXT_FOR.get(content_type, ".jpg")
    filename = uid + ext
    abs_path = os.path.join(SAVE_DIR, filename)
    with open(abs_path, "wb") as f:
        f.write(contents)
    return f"/assets/uploads/{filename}"


# --- API Endpoints ---

@router.post("/identify")
async def identify_fish(
    file: UploadFile = File(...),
    persist: bool = Form(True),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    user: Optional[AuthenticatedUser] = Depends(get_optional_user),
):
    """
    Standard Identification Endpoint.
    Supports both guest (no-save) and authenticated (save) users.
    """
    # 1. 基础校验
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, detail=f"Unsupported type: {file.content_type}")
    
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, detail="File too large (>6MB)")

    # 2. AI 推理 (核心功能)
    result = predict.run_inference(contents)
    label = (result.get("label") or "Unknown").strip()
    conf = float(result.get("confidence") or 0.0)

    user_id = user.id if user else None

    # 3. 决策：如果不保存，直接返回预测结果
    if not user_id or not persist:
        return {
            "file_name": file.filename,
            "prediction": result,
            "saved_path": None,
            "catch_id": None,
            "weather": None,
            "authenticated": bool(user_id),
        }

    # 4. 图片存储 (Storage Layer)
    try:
        # 优先尝试云存储，失败降级到本地
        image_url = upload_image(contents, file.content_type)
        if not image_url:
            image_url = save_image_local(contents, file.content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        image_url = save_image_local(contents, file.content_type)

    # 5. 获取天气 (External API)
    weather = None
    if latitude is not None and longitude is not None:
        weather = await fetch_weather(latitude, longitude)

    # 6. ✅ 核心改动：调用 Service 层处理业务逻辑
    #    不再在这里写 models.Catch(...)
    try:
        catch = catch_service.create_catch(
            db=db,
            user_id=user_id,
            image_path=image_url,
            species_label=label,
            species_confidence=conf,
            lat=latitude,
            lng=longitude,
            weather_data=weather
        )
    except Exception as e:
        raise HTTPException(500, detail=f"Service error: {str(e)}")

    # 7. 返回结果
    return {
        "file_name": file.filename,
        "saved_path": image_url,
        "prediction": result,
        "catch_id": catch.id,
        "created_at": catch.created_at.isoformat(),
        "lat": catch.lat,
        "lng": catch.lng,
        "weather": weather,
        "authenticated": True,
        "user_id": user_id,
    }

# 保留 Protected 接口 (如果前端还在用)
@router.post("/identify-protected")
async def identify_fish_protected(
    file: UploadFile = File(...),
    persist: bool = Form(True),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user), # 强制登录
):
    # 复用逻辑 (为了不重复代码，真实项目中通常会提取公共函数 _process_identification)
    # 但为了简单，这里直接调用上面的逻辑也是一种临时方案，
    # 或者把上面大部分逻辑抽离成一个 async def process(...) 函数。
    # 这里为了保持 MVP 简单，我就不重复写一遍了，
    # 建议前端统一改为调用 /identify 即可，因为它已经能处理登录/未登录两种情况。
    
    # 暂时抛出一个指向 /identify 的提示，或者你可以直接复制上面的逻辑
    return await identify_fish(
        file=file, 
        persist=persist, 
        latitude=latitude, 
        longitude=longitude, 
        db=db, 
        user=user
    )