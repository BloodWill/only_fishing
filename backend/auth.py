# backend/auth.py
# JWT verification for Supabase Auth tokens

import os
import httpx
from typing import Optional
from fastapi import HTTPException, Header, Depends
from pydantic import BaseModel

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")  # Optional: for local JWT validation


class AuthenticatedUser(BaseModel):
    """Represents an authenticated user from Supabase"""
    id: str
    email: Optional[str] = None
    role: str = "authenticated"


async def verify_token_with_supabase(token: str) -> Optional[dict]:
    """
    Verify JWT token by calling Supabase's auth endpoint.
    This is the recommended approach as it handles token refresh, revocation, etc.
    """
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_ANON_KEY,
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
    except Exception:
        return None


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> AuthenticatedUser:
    """
    FastAPI dependency to get the current authenticated user.
    
    Usage in routes:
        @router.get("/protected")
        async def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization header format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    
    # Verify with Supabase
    user_data = await verify_token_with_supabase(token)
    
    if not user_data:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return AuthenticatedUser(
        id=user_data.get("id", ""),
        email=user_data.get("email"),
        role=user_data.get("role", "authenticated"),
    )


async def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> Optional[AuthenticatedUser]:
    """
    FastAPI dependency to optionally get the current user.
    Returns None if not authenticated (instead of raising 401).
    
    Useful for endpoints that work for both guests and authenticated users.
    
    Usage in routes:
        @router.get("/public-or-private")
        async def mixed_route(user: Optional[AuthenticatedUser] = Depends(get_optional_user)):
            if user:
                return {"user_id": user.id}
            else:
                return {"message": "Guest access"}
    """
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    user_data = await verify_token_with_supabase(token)
    
    if not user_data:
        return None
    
    return AuthenticatedUser(
        id=user_data.get("id", ""),
        email=user_data.get("email"),
        role=user_data.get("role", "authenticated"),
    )
