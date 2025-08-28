# ml/model.py
from __future__ import annotations
import os, csv, json, hashlib
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import numpy as np
from PIL import Image

# Optional backends — load if available
try:
    import torch
    import torchvision.transforms as T
    _HAVE_TORCH = True
except Exception:
    _HAVE_TORCH = False

try:
    import onnxruntime as ort
    _HAVE_ORT = True
except Exception:
    _HAVE_ORT = False


# ---------- Paths & config ----------
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"  # holds species_ma.csv, synonyms_ma.csv, model files, etc.

# If you trained a model, drop one of these files into ml/data/:
#  - classes.txt (one species_id per line, in *training* order)  <-- highly recommended
#  - fish_cls.onnx  (ONNX exported classifier)
#  - fish_cls.pth   (PyTorch state_dict)
CLASSES_TXT = DATA / "classes.txt"
ONNX_MODEL  = DATA / "fish_cls.onnx"
PTH_MODEL   = DATA / "fish_cls.pth"
MODEL_INFO  = DATA / "model.json"  # optional: {"arch":"mobilenetv3_large_100","input_size":224}

SPECIES_CSV = DATA / "species_ma.csv"   # you placed these already
SYNONYMS_CSV = DATA / "synonyms_ma.csv" # not used at inference, but good to keep


# ---------- Taxonomy ----------
class Taxonomy:
    """Loads canonical species list and resolves index <-> species_id mapping."""

    def __init__(self, species_csv: Path, classes_txt: Optional[Path] = None):
        self.rows = self._load_species(species_csv)
        self.enabled_rows = [r for r in self.rows if r["enabled"]]

        # species_id order: prefer classes.txt (training order), else CSV order of enabled rows
        if classes_txt and classes_txt.exists():
            with open(classes_txt, "r", encoding="utf-8") as f:
                cls_ids = [ln.strip() for ln in f if ln.strip()]
            # keep only IDs that are enabled
            enabled_set = {r["species_id"] for r in self.enabled_rows}
            self.idx2id = [sid for sid in cls_ids if sid in enabled_set]
        else:
            self.idx2id = [r["species_id"] for r in self.enabled_rows]

        self.id2idx = {sid: i for i, sid in enumerate(self.idx2id)}
        self.by_id: Dict[str, dict] = {r["species_id"]: r for r in self.enabled_rows}

    @staticmethod
    def _load_species(path: Path) -> List[dict]:
        rows = []
        with open(path, newline="", encoding="utf-8") as f:
            rdr = csv.DictReader(f)
            for r in rdr:
                r["enabled"] = str(r.get("enabled", "true")).strip().lower() == "true"
                rows.append(r)
        # sanity
        seen = set()
        for r in rows:
            sid = r["species_id"]
            if sid in seen:
                raise ValueError(f"Duplicate species_id in {path}: {sid}")
            seen.add(sid)
        return rows

    def display_tuple(self, sid: str) -> Tuple[str, str]:
        """(common_name, scientific_name)"""
        row = self.by_id.get(sid, {})
        return row.get("common_name", sid), row.get("scientific_name", "")


# ---------- Classifier backends ----------
class _BaseClassifier:
    def __init__(self, taxonomy: Taxonomy, input_size: int = 224):
        self.tax = taxonomy
        self.input_size = input_size

    def preprocess(self, img: Image.Image) -> np.ndarray:
        """Return CHW float32, normalized ImageNet style."""
        img = img.convert("RGB").resize((self.input_size, self.input_size))
        arr = np.asarray(img).astype("float32") / 255.0
        # normalize to ImageNet stats
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr = (arr - mean) / std
        arr = arr.transpose(2, 0, 1)  # HWC -> CHW
        return arr

    def predict_logits(self, img: Image.Image) -> np.ndarray:
        raise NotImplementedError


class TorchClassifier(_BaseClassifier):
    def __init__(self, taxonomy: Taxonomy, pth_path: Path, model_info: Optional[dict]):
        if not _HAVE_TORCH:
            raise RuntimeError("PyTorch not installed")
        input_size = int(model_info.get("input_size", 224)) if model_info else 224
        super().__init__(taxonomy, input_size=input_size)

        arch = (model_info or {}).get("arch", "mobilenetv3_large_100")
        import timm  # lazy import (requires timm installed)
        self.net = timm.create_model(arch, pretrained=False, num_classes=len(self.tax.idx2id))
        sd = torch.load(str(pth_path), map_location="cpu")
        self.net.load_state_dict(sd)
        self.net.eval()

        self._to = torch.no_grad()

    def predict_logits(self, img: Image.Image) -> np.ndarray:
        x = self.preprocess(img)  # CHW
        x = torch.from_numpy(x).unsqueeze(0)  # NCHW
        with torch.no_grad():
            logits = self.net(x)  # (1, C)
        return logits.numpy()[0]


class ONNXClassifier(_BaseClassifier):
    def __init__(self, taxonomy: Taxonomy, onnx_path: Path, model_info: Optional[dict]):
        if not _HAVE_ORT:
            raise RuntimeError("onnxruntime not installed")
        input_size = int(model_info.get("input_size", 224)) if model_info else 224
        super().__init__(taxonomy, input_size=input_size)
        self.sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        self.input_name = self.sess.get_inputs()[0].name
        self.output_name = self.sess.get_outputs()[0].name

    def predict_logits(self, img: Image.Image) -> np.ndarray:
        x = self.preprocess(img)  # CHW
        x = np.expand_dims(x, 0)  # NCHW
        out = self.sess.run([self.output_name], {self.input_name: x})[0]
        return out[0]


class MockClassifier(_BaseClassifier):
    """Deterministic mock so UI/testing works before a real model exists."""
    def __init__(self, taxonomy: Taxonomy, input_size: int = 224):
        super().__init__(taxonomy, input_size=input_size)

    def predict_logits(self, img: Image.Image) -> np.ndarray:
        # seed from image bytes so same image -> same mock prediction
        buf = np.asarray(img.resize((64, 64))).tobytes()
        seed = int(hashlib.sha1(buf).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        logits = rng.normal(size=len(self.tax.idx2id)).astype("float32")
        return logits


# ---------- Facade ----------
class FishIDModel:
    """Loads taxonomy + the best available classifier backend (ONNX, Torch, or Mock)."""

    def __init__(self):
        self.tax = Taxonomy(SPECIES_CSV, classes_txt=CLASSES_TXT)
        self.info = self._load_model_info()

        # Choose backend by available files/libs
        if ONNX_MODEL.exists() and _HAVE_ORT:
            self.backend = ONNXClassifier(self.tax, ONNX_MODEL, self.info)
            self.engine = "onnx"
        elif PTH_MODEL.exists() and _HAVE_TORCH:
            self.backend = TorchClassifier(self.tax, PTH_MODEL, self.info)
            self.engine = "torch"
        else:
            self.backend = MockClassifier(self.tax)
            self.engine = "mock"

    @staticmethod
    def _load_model_info() -> Optional[dict]:
        if MODEL_INFO.exists():
            try:
                return json.loads(MODEL_INFO.read_text(encoding="utf-8"))
            except Exception:
                pass
        return None

    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        x = x - x.max()
        ex = np.exp(x)
        return ex / ex.sum()

    def topk(self, probs: np.ndarray, k: int = 3):
        k = min(k, probs.shape[0])
        idx = np.argpartition(-probs, kth=k-1)[:k]
        idx = idx[np.argsort(-probs[idx])]
        return idx, probs[idx]

    def predict(self, img: Image.Image, k: int = 3):
        logits = self.backend.predict_logits(img)
        # If model's num_classes doesn't match taxonomy (common during setup), truncate/pad
        C = len(self.tax.idx2id)
        if logits.shape[0] != C:
            if logits.shape[0] > C:
                logits = logits[:C]
            else:
                logits = np.pad(logits, (0, C - logits.shape[0]), mode="constant")
        probs = self._softmax(logits)
        idx, p = self.topk(probs, k=k)
        items = []
        for i, conf in zip(idx, p):
            sid = self.tax.idx2id[i]
            cn, sn = self.tax.display_tuple(sid)
            items.append({
                "species_id": sid,
                "common_name": cn,
                "scientific_name": sn,
                "confidence": float(conf),
                "index": int(i),
            })
        return {
            "engine": self.engine,
            "topk": items,
            "num_classes": len(self.tax.idx2id),
        }


# Singleton-style loader (import-costly libs only once)
_MODEL: Optional[FishIDModel] = None

def get_model() -> FishIDModel:
    global _MODEL
    if _MODEL is None:
        _MODEL = FishIDModel()
    return _MODEL
