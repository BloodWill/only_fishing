from io import BytesIO
from PIL import Image

# In the future, load your model once here (global):
# model = load_your_model()

def run_inference(image_bytes: bytes) -> dict:
    # Basic decode to ensure file is an image
    img = Image.open(BytesIO(image_bytes)).convert("RGB")

    # TODO: real inference with your model. For now, return mock top-3.
    # Replace this block with real logits -> softmax -> topk mapping.
    topk = [
        {"label": "Largemouth Bass", "confidence": 0.92},
        {"label": "Smallmouth Bass", "confidence": 0.05},
        {"label": "Bluegill", "confidence": 0.03},
    ]
    return {"label": topk[0]["label"], "confidence": topk[0]["confidence"], "topk": topk}

