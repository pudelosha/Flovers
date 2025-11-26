"""
Dataset for PlantNet-300K based on folder structure:

    .../images/train/<species_name>/image.jpg
    .../images/test/<species_name>/image.jpg

We use torchvision.datasets.ImageFolder, which:
- scans subfolders,
- assigns a numeric class index to each subfolder,
- builds a list of (image_path, class_id).

We also override the default image loader with a "safe_loader"
that gracefully handles corrupted or unreadable images so that
training does not freeze on bad files.
"""

from pathlib import Path

from PIL import Image, UnidentifiedImageError, ImageFile
from torchvision import transforms, datasets

# Allow loading of truncated / slightly corrupted JPEGs
ImageFile.LOAD_TRUNCATED_IMAGES = True


def get_train_transform():
    """
    Data augmentation and preprocessing used for training.
    """
    return transforms.Compose([
        transforms.Resize(256),
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],  # standard ImageNet means
            std=[0.229, 0.224, 0.225],   # standard ImageNet stds
        ),
    ])


def get_val_transform():
    """
    Preprocessing used for validation / evaluation.
    """
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
    """
    Robust image loader.

    - Tries to open the image and convert it to RGB.
    - If the file is corrupted, truncated, or otherwise unreadable,
      it returns a simple black image instead of raising or hanging.

    This way, training can continue even if a few images are bad.
    """
    try:
        img = Image.open(path)
        return img.convert("RGB")
    except (UnidentifiedImageError, OSError, IOError):
        # Fallback: black dummy image (224x224). It won't teach the model much,
        # but it prevents the whole training from freezing on a bad file.
        return Image.new("RGB", (224, 224), (0, 0, 0))


class PlantNetFolderDataset(datasets.ImageFolder):
    """
    Thin wrapper around torchvision.datasets.ImageFolder,
    mainly for readability and to plug in our transforms + safe loader.

    ImageFolder expects:
      root/
        class_0/
          img001.jpg
          ...
        class_1/
          ...
        ...

    It automatically builds:
      - self.samples: list of (path, class_index)
      - self.classes: list of class names (subfolder names)
    """

    def __init__(self, root: Path, train: bool = True):
        root = Path(root)
        transform = get_train_transform() if train else get_val_transform()
        super().__init__(root=root, transform=transform)

        # Override how images are loaded so corrupted files can't freeze training
        self.loader = safe_loader
