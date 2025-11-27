"""
Export the best PlantNet ResNet18 model + class names
into clean artifacts for inference.

Usage (from ml/):

    .venv/Scripts/activate
    python export_model.py
"""

from pathlib import Path
import json

import torch
from torch import nn
from torchvision.models import resnet18

from config import CHECKPOINT_DIR, TRAIN_DIR, DEVICE
from dataset import PlantNetFolderDataset

BEST_MODEL_NAME = "plantnet_resnet18_best.pth"

# Resolve paths relative to this file (ml folder)
ML_ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ML_ROOT / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

EXPORT_WEIGHTS = ARTIFACTS_DIR / "plantnet_resnet18_v1_state_dict.pt"
EXPORT_CLASSES = ARTIFACTS_DIR / "plantnet_resnet18_v1_classes.json"


def build_model(num_classes: int) -> nn.Module:
    """
    Rebuild the same ResNet18 architecture used in training.
    We don't need ImageNet weights here; we'll load our trained weights.
    """
    model = resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def main():
    best_model_path = CHECKPOINT_DIR / BEST_MODEL_NAME
    if not best_model_path.exists():
        raise FileNotFoundError(f"Best model not found at: {best_model_path}")

    print(f"[Export] TRAIN_DIR = {TRAIN_DIR}")
    print(f"[Export] Loading class list from training dataset...")

    # This scans folder names, it does NOT load all images into RAM
    train_ds = PlantNetFolderDataset(TRAIN_DIR, train=True)
    classes = train_ds.classes
    num_classes = len(classes)
    print(f"[Export] Found {num_classes} classes.")

    print(f"[Export] Building model architecture...")
    model = build_model(num_classes=num_classes)
    model.to(DEVICE)

    print(f"[Export] Loading best weights from {best_model_path}")
    state_dict = torch.load(best_model_path, map_location=DEVICE)
    model.load_state_dict(state_dict)

    print(f"[Export] Saving state_dict to {EXPORT_WEIGHTS}")
    torch.save(model.state_dict(), EXPORT_WEIGHTS)

    print(f"[Export] Saving classes to {EXPORT_CLASSES}")
    with open(EXPORT_CLASSES, "w", encoding="utf-8") as f:
        json.dump(classes, f, ensure_ascii=False, indent=2)

    print(f"[Export] Done. Artifacts in: {ARTIFACTS_DIR}")


if __name__ == "__main__":
    main()
