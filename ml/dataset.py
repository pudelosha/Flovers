"""
PlantNet-300K dataset definition for training.
TODO: update IMAGE_ROOT and METADATA_PATH usage to match your real layout.
"""

import json
from pathlib import Path
from typing import Tuple

from PIL import Image
import torch
from torch.utils.data import Dataset
from torchvision import transforms


class PlantNetDataset(Dataset):
    def __init__(self, image_root: Path, metadata_path: Path, split: str = "train"):
        self.image_root = Path(image_root)
        self.metadata_path = Path(metadata_path)
        self.split = split

        # Expected JSON format: list of objects with keys:
        # {"image_path": "...relative/path.jpg", "class_id": int, "split": "train"/"val"/"test"}
        meta = json.loads(self.metadata_path.read_text())
        self.items = [
            (item["image_path"], item["class_id"])
            for item in meta
            if item["split"] == split
        ]

        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        rel_path, class_id = self.items[idx]
        img_path = self.image_root / rel_path
        img = Image.open(img_path).convert("RGB")
        img = self.transform(img)
        return img, int(class_id)
