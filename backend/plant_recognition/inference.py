from __future__ import annotations

import json
import os
from pathlib import Path
from typing import List, Dict

import torch
from torch import nn
from torchvision.models import resnet18
from torchvision import transforms
from PIL import Image

# --- Paths & device ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"

# Choose which model to load via env var (optional).
# Examples:
#   setx PLANT_MODEL web_scrapped_resnet18_v1
#   setx PLANT_MODEL plants_downloaded_resnet18_v1
MODEL_NAME = os.environ.get("PLANT_MODEL", "web_scrapped_resnet18_v1")

WEIGHTS_PATH = ARTIFACTS_DIR / f"{MODEL_NAME}_best.pth"
CLASSES_PATH = ARTIFACTS_DIR / f"{MODEL_NAME}_classes.json"

DEVICE = torch.device("cpu")  # VPS will run CPU inference

# --- Transforms (same as validation during training) ------------------------

_val_transform = transforms.Compose(
    [
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)

# --- Load class names ------------------------------------------------------


def _load_class_names() -> list[str]:
    """
    Load the mapping index -> class label from classes.json.

    Supports:
    - a list: ["Foo", "Bar", ...]
    - a dict: {"0": "Foo", "1": "Bar", ...}
    """
    if not CLASSES_PATH.exists():
        raise FileNotFoundError(f"Classes file not found at {CLASSES_PATH}")

    with CLASSES_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        # keys "0", "1", ...
        return [data[str(i)] for i in range(len(data))]
    raise ValueError("Unsupported classes.json format")


CLASS_NAMES: list[str] = _load_class_names()

# --- Build and load model --------------------------------------------------


def _build_model(num_classes: int) -> nn.Module:
    """
    Build the same ResNet18 head as in training, but without ImageNet weights.
    We only load our trained weights from state_dict.
    """
    model = resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def _load_model() -> nn.Module:
    if not WEIGHTS_PATH.exists():
        raise FileNotFoundError(
            f"Model weights not found at {WEIGHTS_PATH}. "
            f"Set PLANT_MODEL env var or place the file in artifacts/."
        )

    num_classes = len(CLASS_NAMES)
    model = _build_model(num_classes)

    try:
        state = torch.load(WEIGHTS_PATH, map_location=DEVICE)

        # In your training, "best.pth" is saved via torch.save(model.state_dict(), ...),
        # so 'state' should be a state_dict. This handles both formats safely:
        if isinstance(state, dict) and "model_state" in state:
            # checkpoint-style dict (if ever used)
            state_dict = state["model_state"]
        else:
            # state_dict-style (expected)
            state_dict = state

        # strict=True is safer; if you ever change heads/classes it should fail loudly.
        model.load_state_dict(state_dict, strict=True)

    except Exception as e:
        raise RuntimeError(
            f"Failed to load model weights from {WEIGHTS_PATH}. Error: {e}"
        ) from e

    model.to(DEVICE)
    model.eval()
    return model


# Single global model instance, loaded once at import time
MODEL: nn.Module = _load_model()

# --- Public prediction API -------------------------------------------------


def predict_topk(
    image: Image.Image,
    topk: int = 3,
) -> List[Dict]:
    """
    Run inference on a PIL image and return top-K predictions.

    Returns a list of dicts like:
    [
      {
        "id": "ml-123",
        "name": "Nephrolepis_exaltata",
        "latin": "Nephrolepis_exaltata",
        "score": 0.85,
        "rank": 1,
      },
      ...
    ]
    """
    image = image.convert("RGB")
    x = _val_transform(image).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = MODEL(x)
        probs = torch.softmax(logits, dim=1)[0]
        k = max(1, min(int(topk), 10))
        top_probs, top_idxs = probs.topk(k)

    results: List[Dict] = []
    for rank, (p, idx) in enumerate(zip(top_probs.tolist(), top_idxs.tolist()), start=1):
        name = CLASS_NAMES[idx]
        results.append(
            {
                "id": f"ml-{idx}",  # views.py maps this to id=None for API output
                "name": name,
                "latin": name,
                "score": float(p),
                "rank": rank,
            }
        )
    return results
