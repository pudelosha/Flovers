"""
Central config for training on the 'web_scrapped' dataset.

Expected folder structure:

    ml/data/web_scrapped/images/train/<class_name>/*.jpg
    ml/data/web_scrapped/images/val/<class_name>/*.jpg
"""

from pathlib import Path
import torch

# Base paths
PROJECT_ROOT = Path(__file__).resolve().parents[1]   # .../Flovers
ML_ROOT = PROJECT_ROOT / "ml"

# Dataset root
DATA_ROOT = ML_ROOT / "data" / "web_scrapped" / "images"

# Subfolders with images
TRAIN_DIR = DATA_ROOT / "train"
VAL_DIR = DATA_ROOT / "val"

# Checkpoints & logs
CHECKPOINT_DIR = ML_ROOT / "checkpoints"
LOG_DIR = ML_ROOT / "logs"

# Training hyperparameters
BATCH_SIZE = 16
NUM_EPOCHS = 10
LR = 1e-4
WEIGHT_DECAY = 1e-4
NUM_WORKERS = 0  # safest on Windows

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
