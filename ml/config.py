"""
Central config for PlantNet-300K training

We assume this folder structure:

ml/data/plantnet_300K/plantnet_300K/images/train/...
ml/data/plantnet_300K/plantnet_300K/images/test/...

If you later get a separate 'val' folder, you can change VAL_DIR below.
"""

from pathlib import Path
import torch

# Base paths
PROJECT_ROOT = Path(__file__).resolve().parents[1]   # .../Flovers
ML_ROOT = PROJECT_ROOT / "ml"

# Extracted dataset root
DATA_ROOT = ML_ROOT / "data" / "plantnet_300K" / "plantnet_300K" / "images"

# Subfolders with images
TRAIN_DIR = DATA_ROOT / "train"   # used as training set
VAL_DIR = DATA_ROOT / "test"      # used as validation set (for now test=val)

CHECKPOINT_DIR = ML_ROOT / "checkpoints"
LOG_DIR = ML_ROOT / "logs"

# Training hyperparameters
BATCH_SIZE = 16        # if your PC struggles, reduce to 16 or 8
NUM_EPOCHS = 20        # start with this, then adjust based on training time
LR = 1e-4
WEIGHT_DECAY = 1e-4
NUM_WORKERS = 0        # 0 is safest on Windows; on Linux you can increase (e.g. 4)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
