"""
Supabase Storage helper for fish photo uploads.
Replaces local file storage with Supabase cloud storage.
"""
import os
import uuid
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
BUCKET_NAME = "fish_photos"

# Lazy-loaded Supabase client
_supabase = None


def get_supabase():
    """Get or create Supabase client (lazy initialization)"""
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return None  # Fall back to local storage if not configured
        from supabase import create_client
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


def upload_image(image_bytes: bytes, content_type: str) -> Optional[str]:
    """
    Upload image to Supabase Storage.
    
    Returns:
        Public URL of uploaded image, or None if Supabase not configured
    """
    supabase = get_supabase()
    if not supabase:
        return None  # Signal to use local storage fallback
    
    # Determine file extension
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map.get(content_type, "jpg")
    
    # Generate unique filename
    filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = f"catches/{filename}"
    
    # Upload to Supabase Storage
    supabase.storage.from_(BUCKET_NAME).upload(
        path=file_path,
        file=image_bytes,
        file_options={"content-type": content_type}
    )
    
    # Get public URL
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_path)
    return public_url


def delete_image(image_url: str) -> bool:
    """
    Delete image from Supabase Storage.
    
    Args:
        image_url: Full public URL or path of the image
    
    Returns:
        True if deleted successfully
    """
    supabase = get_supabase()
    if not supabase:
        return False
    
    try:
        # Extract file path from URL
        # URL: https://xxx.supabase.co/storage/v1/object/public/fish-photos/catches/abc.jpg
        if BUCKET_NAME in image_url:
            file_path = image_url.split(f"{BUCKET_NAME}/")[1]
            supabase.storage.from_(BUCKET_NAME).remove([file_path])
            return True
    except Exception as e:
        print(f"Error deleting image: {e}")
    
    return False


def is_supabase_url(path: str) -> bool:
    """Check if path is a Supabase Storage URL vs local path"""
    return path.startswith("http") if path else False
