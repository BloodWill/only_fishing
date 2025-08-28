# backend/routers/predict.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from pathlib import Path
import hashlib, json

# our ML inference
from ml.predict import run_inference

router = APIRouter(tags=["ml"])

# resolve .../<project-root>/ml/data
PROJECT_ROOT = Path(__file__).resolve().parents[1].parent
ML_DATA = PROJECT_ROOT / "ml" / "data"
ML_DATA.mkdir(parents=True, exist_ok=True)
FEEDBACK_FILE = ML_DATA / "feedback.jsonl"

def sha1_bytes(b: bytes) -> str:
    return hashlib.sha1(b).hexdigest()

@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Empty file")
    try:
        out = run_inference(raw)        # uses ONNX/Torch/Mock automatically
        out["image_sha1"] = sha1_bytes(raw)
        return out
    except Exception as e:
        raise HTTPException(500, f"predict failed: {e}")

class FeedbackIn(BaseModel):
    image_sha1: str
    chosen_species_id: str
    topk: List[Dict[str, Any]]
    user_id: Optional[str] = None
    source: Optional[str] = "app"

@router.post("/feedback")
async def feedback(body: FeedbackIn):
    rec = body.model_dump()
    with FEEDBACK_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return {"ok": True}
