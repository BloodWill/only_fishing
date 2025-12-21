# backend/auth.py
# JWT verification locally (Performance optimized)

import os
import jwt  # pip install pyjwt
from typing import Optional
from fastapi import HTTPException, Header, Depends
from pydantic import BaseModel

# Supabase configuration
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
ALGORITHM = "HS256"

class AuthenticatedUser(BaseModel):
    """Represents an authenticated user from Supabase"""
    id: str
    email: Optional[str] = None
    role: str = "authenticated"

async def verify_token_locally(token: str) -> Optional[dict]:
    """
    Verify JWT token locally using the secret.
    This is much faster than calling Supabase API for every request.
    """
    if not SUPABASE_JWT_SECRET:
        # 如果没有配置 Secret，为了安全起见，返回 None (或者你可以选择在开发环境放行，但不推荐)
        print("Error: SUPABASE_JWT_SECRET is not set in environment variables.")
        return None
    
    try:
        # Supabase tokens usually have 'aud': 'authenticated'.
        # If you encounter "Invalid audience" errors, you can set verify_aud=False
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=[ALGORITHM],
            options={"verify_aud": False} 
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.PyJWTError as e:
        print(f"JWT Verification Error: {e}")
        return None

async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> AuthenticatedUser:
    """
    FastAPI dependency to get the current authenticated user.
    Throws 401 if not authenticated.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    
    # 使用本地验证替代远程请求
    payload = await verify_token_locally(token)
    
    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Supabase JWT payload 中，用户 ID 通常在 'sub' 字段
    return AuthenticatedUser(
        id=payload.get("sub"),
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
    )

async def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Optional[AuthenticatedUser]:
    """
    FastAPI dependency to optionally get the current user.
    Returns None if not authenticated.
    """
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    payload = await verify_token_locally(token)
    
    if not payload:
        return None
    
    return AuthenticatedUser(
        id=payload.get("sub"),
        email=payload.get("email"),
        role=payload.get("role", "authenticated"),
    )