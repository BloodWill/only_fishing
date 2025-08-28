# ml/predict.py
from __future__ import annotations
from io import BytesIO
from PIL import Image
from typing import Dict, Any

from .model import get_model

def run_inference(image_bytes: bytes) -> Dict[str, Any]:
    """
    Accepts raw image bytes, returns:
    {
      "engine": "onnx" | "torch" | "mock",
      "label": "<common_name>",                # top-1
      "species_id": "sp_xxx",                  # top-1
      "confidence": 0.93,                      # top-1
      "topk": [ { species_id, common_name, scientific_name, confidence }, ... ],
      "num_classes": 60
    }
    """
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    model = get_model()
    result = model.predict(img, k=3)

    # promote top-1 for convenience
    top1 = result["topk"][0]
    out = {
        "engine": result["engine"],
        "label": top1["common_name"],
        "species_id": top1["species_id"],
        "confidence": top1["confidence"],
        "topk": result["topk"],
        "num_classes": result["num_classes"],
    }
    return out
