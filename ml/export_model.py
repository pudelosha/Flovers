"""
Dataset for the plants dataset based on folder structure:

    .../images/train/<latin_name>/image.jpg
    .../images/val/<latin_name>/image.jpg

Uses torchvision.datasets.ImageFolder and a robust image loader that:
- tolerates truncated / partially corrupted images
- suppresses noisy PIL warnings
- never freezes training on bad files
"""

from pathlib import Path
import warnings

from PIL import Image, UnidentifiedImageError, ImageFile
from torchvision import transforms, datasets

# Allow loading of truncated / slightly corrupted JPEGs
ImageFile.LOAD_TRUNCATED_IMAGES = True


# ----------------------------------------------------------------------
# Transforms
# ----------------------------------------------------------------------

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
            mean=[0.485, 0.456, 0.406],  # ImageNet means
            std=[0.229, 0.224, 0.225],   # ImageNet stds
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


# ----------------------------------------------------------------------
# Robust image loader
# ----------------------------------------------------------------------

def safe_loader(path: str) -> Image.Image:
    """
    Robust image loader.

    - Opens image and converts to RGB.
    - Suppresses common PIL UserWarnings (palette + transparency).
    - Returns a dummy black image if loading fails.

    This guarantees that training never freezes due to a bad image file.
    """
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", UserWarning)
            img = Image.open(path)
            return img.convert("RGB")
    except (UnidentifiedImageError, OSError, IOError):
        # Fallback: black dummy image (224x224)
        return Image.new("RGB", (224, 224), (0, 0, 0))


# ----------------------------------------------------------------------
# Dataset wrapper
# ----------------------------------------------------------------------

class PlantNetFolderDataset(datasets.ImageFolder):
    """
    Thin wrapper around torchvision.datasets.ImageFolder.

    ImageFolder expects:
      root/
        class_0/
          img001.jpg
          ...
        class_1/
          ...

    It automatically builds:
      - self.samples: list of (path, class_index)
      - self.classes: list of class names (folder names)
    """

    def __init__(self, root: Path, train: bool = True):
        root = Path(root)
        transform = get_train_transform() if train else get_val_transform()
        super().__init__(root=root, transform=transform)

        # Override image loading with safe loader
        self.loader = safe_loader
