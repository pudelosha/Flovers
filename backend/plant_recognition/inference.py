from __future__ import annotations

import json
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

WEIGHTS_PATH = ARTIFACTS_DIR / "plantnet_resnet18_v1_state_dict.pt"
CLASSES_PATH = ARTIFACTS_DIR / "plantnet_resnet18_v1_classes.json"

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
        raise FileNotFoundError(f"Model weights not found at {WEIGHTS_PATH}")

    num_classes = len(CLASS_NAMES)
    model = _build_model(num_classes)

    try:
        state = torch.load(WEIGHTS_PATH, map_location=DEVICE)
        # strict=False is more forgiving if there are minor key mismatches
        model.load_state_dict(state, strict=False)
    except Exception as e:
        # Bubble up a clearer error message so you can see it in logs
        raise RuntimeError(f"Failed to load model weights: {e}") from e

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
        "name": "Nephrolepis exaltata",
        "latin": "Nephrolepis exaltata",
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
        top_probs, top_idxs = probs.topk(topk)

    results: List[Dict] = []
    for rank, (p, idx) in enumerate(zip(top_probs.tolist(), top_idxs.tolist()), start=1):
        name = CLASS_NAMES[idx]
        results.append(
            {
                "id": f"ml-{idx}",  # no DB id yet, just a stable ML id
                "name": name,
                "latin": name,  # you can refine later if you store separate latin/common
                "score": float(p),
                "rank": rank,
            }
        )
    return results
