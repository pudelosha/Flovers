"""
Dataset for the web_scrapped dataset based on folder structure:

    .../images/train/<class_name>/image.jpg
    .../images/val/<class_name>/image.jpg

We use torchvision.datasets.ImageFolder with a safe_loader
that gracefully handles corrupted/unreadable images.
"""

from pathlib import Path

from PIL import Image, UnidentifiedImageError, ImageFile
from torchvision import transforms, datasets

ImageFile.LOAD_TRUNCATED_IMAGES = True


def get_train_transform():
    return transforms.Compose([
        transforms.Resize(256),
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])


def get_val_transform():
    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])


def safe_loader(path: str) -> Image.Image:
    try:
        img = Image.open(path)
        return img.convert("RGB")
    except (UnidentifiedImageError, OSError, IOError):
        return Image.new("RGB", (224, 224), (0, 0, 0))


class PlantNetFolderDataset(datasets.ImageFolder):
    def __init__(self, root: Path, train: bool = True):
        root = Path(root)
        transform = get_train_transform() if train else get_val_transform()
        super().__init__(root=root, transform=transform)
        self.loader = safe_loader
