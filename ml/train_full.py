"""
Full training script for PlantNet-300K (all 1081 classes).

Run from project root:
    cd ml
    python train_full.py

You MUST adjust config.py paths to your local dataset before running.
"""

from pathlib import Path

import torch
from torch import nn, optim
from torch.utils.data import DataLoader
from torchvision.models import resnet18

from dataset import PlantNetDataset
from config import (
    IMAGE_ROOT,
    METADATA_PATH,
    NUM_CLASSES,
    BATCH_SIZE,
    NUM_EPOCHS,
    LR,
    WEIGHT_DECAY,
    NUM_WORKERS,
    DEVICE,
    CHECKPOINT_DIR,
)


def get_loaders():
    train_ds = PlantNetDataset(IMAGE_ROOT, METADATA_PATH, split="train")
    val_ds = PlantNetDataset(IMAGE_ROOT, METADATA_PATH, split="val")

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
    return train_loader, val_loader


def build_model() -> nn.Module:
    model = resnet18(weights="IMAGENET1K_V1")
    model.fc = nn.Linear(model.fc.in_features, NUM_CLASSES)
    return model


def train_one_epoch(model, loader, criterion, optimizer, epoch: int):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for step, (images, targets) in enumerate(loader, start=1):
        images = images.to(DEVICE)
        targets = targets.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, dim=1)
        correct += (preds == targets).sum().item()
        total += targets.size(0)

        if step % 50 == 0:
            print(f"Epoch {epoch} | step {step}/{len(loader)} | loss={loss.item():.4f}")

    epoch_loss = running_loss / float(total)
    epoch_acc = correct / float(total)
    return epoch_loss, epoch_acc


def evaluate(model, loader, criterion):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, targets in loader:
            images = images.to(DEVICE)
            targets = targets.to(DEVICE)

            outputs = model(images)
            loss = criterion(outputs, targets)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, dim=1)
            correct += (preds == targets).sum().item()
            total += targets.size(0)

    val_loss = running_loss / float(total)
    val_acc = correct / float(total)
    return val_loss, val_acc


def main():
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    train_loader, val_loader = get_loaders()
    model = build_model().to(DEVICE)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)

    best_val_acc = 0.0

    for epoch in range(1, NUM_EPOCHS + 1):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, epoch)
        val_loss, val_acc = evaluate(model, val_loader, criterion)

        print(
            f"Epoch {epoch}/{NUM_EPOCHS} "
            f"- train_loss={train_loss:.4f}, train_acc={train_acc:.4f} "
            f"- val_loss={val_loss:.4f}, val_acc={val_acc:.4f}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            ckpt_path = CHECKPOINT_DIR / "plantnet_resnet18_best.pth"
            torch.save(model.state_dict(), ckpt_path)
            print(f"Saved new best model to {ckpt_path} (val_acc={best_val_acc:.4f})")

    print("Training finished.")


if __name__ == "__main__":
    main()
