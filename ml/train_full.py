"""
Full training script for ResNet18 on the 'web_scrapped' dataset
using folder structure, with checkpointing and resume support.

Expected dataset layout (configured in config.py):

    ml/data/web_scrapped/images/train/<class_name>/image.jpg
    ml/data/web_scrapped/images/val/<class_name>/image.jpg

Usage (from the 'ml' folder):

    cd C:/Projekty/Python/Flovers/ml
    .venv/Scripts/activate
    pip install -r requirements-ml.txt

    # start fresh training
    python train_full.py

    # resume from last checkpoint (if it exists)
    python train_full.py --resume
"""

import argparse
import time
from pathlib import Path
import json

import torch
from torch import nn, optim
from torch.utils.data import DataLoader
from torchvision.models import resnet18

from dataset import PlantNetFolderDataset
from config import (
    TRAIN_DIR,
    VAL_DIR,
    BATCH_SIZE,
    NUM_EPOCHS,
    LR,
    WEIGHT_DECAY,
    NUM_WORKERS,
    DEVICE,
    CHECKPOINT_DIR,
)

# Dataset/version-specific checkpoint filenames
LAST_CHECKPOINT_NAME = "web_scrapped_resnet18_v1_checkpoint.pth"
BEST_MODEL_NAME = "web_scrapped_resnet18_v1_best.pth"
CLASSES_FILENAME = "web_scrapped_resnet18_v1_classes.json"

SAVE_EVERY_STEPS = 2000


def get_loaders():
    print(f"[Data] Train dir: {TRAIN_DIR}")
    print(f"[Data] Val dir:   {VAL_DIR}")

    if not TRAIN_DIR.exists():
        raise FileNotFoundError(f"TRAIN_DIR not found: {TRAIN_DIR}")
    if not VAL_DIR.exists():
        raise FileNotFoundError(f"VAL_DIR not found: {VAL_DIR}")

    train_ds = PlantNetFolderDataset(TRAIN_DIR, train=True)
    val_ds = PlantNetFolderDataset(VAL_DIR, train=False)

    print(f"[Data] Train samples: {len(train_ds)}")
    print(f"[Data] Val samples:   {len(val_ds)}")
    print(f"[Data] Num classes:   {len(train_ds.classes)}")

    train_loader = DataLoader(
        train_ds,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
    )

    return train_loader, val_loader, train_ds, val_ds


def save_class_names(train_ds):
    classes = train_ds.classes
    classes_path = CHECKPOINT_DIR / CLASSES_FILENAME
    with classes_path.open("w", encoding="utf-8") as f:
        json.dump(classes, f, ensure_ascii=False, indent=2)
    print(f"[Classes] Saved {len(classes)} class names to {classes_path}")


def build_model(num_classes: int) -> nn.Module:
    print("[Model] Loading ResNet18 with ImageNet weights...")
    model = resnet18(weights="IMAGENET1K_V1")
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    print(f"[Model] Final FC layer replaced for {num_classes} classes.")
    return model


def train_one_epoch(
    model,
    loader,
    criterion,
    optimizer,
    epoch: int,
    global_step: int,
    last_ckpt_path: Path,
    best_val_acc: float,
    num_classes: int,
):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    num_batches = len(loader)
    log_every = 50
    epoch_start_time = time.time()

    for step, (images, targets) in enumerate(loader, start=1):
        images = images.to(DEVICE)
        targets = targets.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        batch_size = images.size(0)
        running_loss += loss.item() * batch_size
        _, preds = torch.max(outputs, dim=1)
        correct += (preds == targets).sum().item()
        total += batch_size

        global_step += 1

        if step % log_every == 0 or step == 1 or step == num_batches:
            avg_loss = running_loss / float(total)
            avg_acc = correct / float(total)
            elapsed = time.time() - epoch_start_time
            steps_per_sec = step / max(elapsed, 1e-6)
            eta_batches = num_batches - step
            eta_sec = eta_batches / max(steps_per_sec, 1e-6)

            print(
                f"Epoch {epoch} | step {step}/{num_batches} | global_step={global_step} "
                f"| loss(last)={loss.item():.4f} | avg_loss={avg_loss:.4f} "
                f"| avg_acc={avg_acc:.4f} | elapsed={elapsed/60:.1f} min "
                f"| ETA={eta_sec/60:.1f} min"
            )

        if global_step % SAVE_EVERY_STEPS == 0:
            state = {
                "epoch": epoch,
                "model_state": model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "best_val_acc": best_val_acc,
                "num_classes": num_classes,
                "global_step": global_step,
            }
            torch.save(state, last_ckpt_path)
            print(
                f"[Checkpoint] Mid-epoch save at global_step={global_step} "
                f"(epoch={epoch}, step={step}/{num_batches}) -> {last_ckpt_path}"
            )

    epoch_time = time.time() - epoch_start_time
    epoch_loss = running_loss / float(total)
    epoch_acc = correct / float(total)
    print(
        f"[Epoch {epoch}] Finished in {epoch_time/60:.1f} min "
        f"-> train_loss={epoch_loss:.4f}, train_acc={epoch_acc:.4f}"
    )
    return epoch_loss, epoch_acc, global_step


def evaluate(model, loader, criterion, epoch: int):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    eval_start = time.time()
    with torch.no_grad():
        for images, targets in loader:
            images = images.to(DEVICE)
            targets = targets.to(DEVICE)

            outputs = model(images)
            loss = criterion(outputs, targets)

            batch_size = images.size(0)
            running_loss += loss.item() * batch_size
            _, preds = torch.max(outputs, dim=1)
            correct += (preds == targets).sum().item()
            total += batch_size

    val_time = time.time() - eval_start
    val_loss = running_loss / float(total)
    val_acc = correct / float(total)
    print(
        f"[Eval {epoch}] Finished in {val_time/60:.1f} min "
        f"-> val_loss={val_loss:.4f}, val_acc={val_acc:.4f}"
    )
    return val_loss, val_acc


def save_checkpoint(
    model,
    optimizer,
    epoch: int,
    best_val_acc: float,
    num_classes: int,
    global_step: int,
    path: Path,
):
    state = {
        "epoch": epoch,
        "model_state": model.state_dict(),
        "optimizer_state": optimizer.state_dict(),
        "best_val_acc": best_val_acc,
        "num_classes": num_classes,
        "global_step": global_step,
    }
    torch.save(state, path)
    print(f"[Checkpoint] Saved training state to {path}")


def load_checkpoint(path: Path, model: nn.Module, optimizer: optim.Optimizer):
    checkpoint = torch.load(path, map_location=DEVICE)
    model.load_state_dict(checkpoint["model_state"])
    optimizer.load_state_dict(checkpoint["optimizer_state"])

    last_epoch = checkpoint.get("epoch", 0)
    best_val_acc = checkpoint.get("best_val_acc", 0.0)
    num_classes = checkpoint.get("num_classes", None)
    global_step = checkpoint.get("global_step", 0)

    print(
        f"[Checkpoint] Loaded from {path} "
        f"(last_epoch={last_epoch}, best_val_acc={best_val_acc:.4f}, "
        f"global_step={global_step})"
    )

    start_epoch = last_epoch + 1
    return start_epoch, best_val_acc, num_classes, global_step


def parse_args():
    parser = argparse.ArgumentParser(description="Train ResNet18 on web_scrapped")
    parser.add_argument("--resume", action="store_true",
                        help="Resume training from the last checkpoint if it exists.")
    parser.add_argument("--checkpoint-path", type=str, default=None,
                        help="Optional custom checkpoint path.")
    return parser.parse_args()


def main():
    args = parse_args()

    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    last_ckpt_path = (
        Path(args.checkpoint_path)
        if args.checkpoint_path is not None
        else CHECKPOINT_DIR / LAST_CHECKPOINT_NAME
    )
    best_model_path = CHECKPOINT_DIR / BEST_MODEL_NAME

    train_loader, val_loader, train_ds, _ = get_loaders()
    num_classes = len(train_ds.classes)

    save_class_names(train_ds)

    print(f"[Setup] Using device: {DEVICE}")
    print(f"[Setup] Batch size: {BATCH_SIZE}, Epochs: {NUM_EPOCHS}")
    print(f"[Setup] Num workers: {NUM_WORKERS}, Save-every-steps: {SAVE_EVERY_STEPS}")

    model = build_model(num_classes).to(DEVICE)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)

    start_epoch = 1
    best_val_acc = 0.0
    global_step = 0

    if args.resume and last_ckpt_path.exists():
        print(f"[Resume] Attempting to resume from {last_ckpt_path}")
        start_epoch, best_val_acc_ckpt, num_classes_ckpt, global_step_ckpt = (
            load_checkpoint(last_ckpt_path, model, optimizer)
        )

        if num_classes_ckpt is not None and num_classes_ckpt != num_classes:
            print(
                f"[Warning] Checkpoint num_classes={num_classes_ckpt} "
                f"!= current num_classes={num_classes}. Starting from scratch."
            )
            start_epoch = 1
            best_val_acc = 0.0
            global_step = 0
        else:
            best_val_acc = best_val_acc_ckpt
            global_step = global_step_ckpt
            print(
                f"[Resume] Continuing from epoch {start_epoch} "
                f"with best_val_acc={best_val_acc:.4f}, global_step={global_step}"
            )
    elif args.resume:
        print(f"[Resume] No checkpoint at {last_ckpt_path}. Starting from scratch.")

    try:
        overall_start = time.time()
        for epoch in range(start_epoch, NUM_EPOCHS + 1):
            print(f"\n========== Epoch {epoch}/{NUM_EPOCHS} ==========")

            train_loss, train_acc, global_step = train_one_epoch(
                model, train_loader, criterion, optimizer,
                epoch, global_step, last_ckpt_path, best_val_acc, num_classes
            )
            val_loss, val_acc = evaluate(model, val_loader, criterion, epoch)

            print(
                f"[Summary] Epoch {epoch}/{NUM_EPOCHS} "
                f"- train_loss={train_loss:.4f}, train_acc={train_acc:.4f} "
                f"- val_loss={val_loss:.4f}, val_acc={val_acc:.4f}"
            )

            save_checkpoint(
                model, optimizer, epoch, best_val_acc, num_classes, global_step, last_ckpt_path
            )

            if val_acc > best_val_acc:
                best_val_acc = val_acc
                torch.save(model.state_dict(), best_model_path)
                print(f"[Best] Saved new best model -> {best_model_path} (val_acc={best_val_acc:.4f})")

        total_time = time.time() - overall_start
        print(f"\n[Done] Training finished in {total_time/3600:.2f} hours.")
    except KeyboardInterrupt:
        print("\n[Interrupt] Training interrupted by user.")
        print(f"[Interrupt] Last checkpoint is at: {last_ckpt_path}")


if __name__ == "__main__":
    main()
