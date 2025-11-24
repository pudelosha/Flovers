"""
Central config for PlantNet training.

IMPORTANT:
  - Update IMAGE_ROOT and METADATA_PATH to match your local PlantNet-300K layout.
"""

from pathlib import Path
import torch

PROJECT_ROOT = Path(__file__).resolve().parents[1]   # FloVers/
ML_ROOT = PROJECT_ROOT / "ml"

# TODO: adapt these to your real folders
IMAGE_ROOT = ML_ROOT / "data" / "images"             # folder containing all images
METADATA_PATH = ML_ROOT / "data" / "plantnet300K_metadata.json"

CHECKPOINT_DIR = ML_ROOT / "checkpoints"
LOG_DIR = ML_ROOT / "logs"

NUM_CLASSES = 1081
BATCH_SIZE = 32        # lower this if RAM/CPU struggle
NUM_EPOCHS = 10
LR = 1e-4
WEIGHT_DECAY = 1e-4
NUM_WORKERS = 0        # good default on Windows; can increase later

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
