"""Training script for U-Net flood segmentation on Sen1Floods11 (Phase 2).

Architecture: U-Net with ResNet34 encoder (ImageNet pretrained, 3 channels).
Input channels: VV, VH, (VV - VH).
Loss: Dice + BCE with no-data (-1) masking.
Optimized for Apple MPS / CUDA / CPU.
"""

from __future__ import annotations

import argparse
import os
import random
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import segmentation_models_pytorch as smp
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from pipeline.dataset import Sen1Floods11Dataset
from pipeline.loss import MaskedDiceBCELoss


def set_seed(seed: int = 42) -> None:
    """Set random seeds for strict reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def get_device(requested_device: str | None = None) -> torch.device:
    """Detect available compute device: cuda, mps (Apple Silicon), or cpu."""
    if requested_device:
        return torch.device(requested_device)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available() and torch.backends.mps.is_built():
        return torch.device("mps")
    return torch.device("cpu")


def create_unet_resnet34() -> nn.Module:
    """Create U-Net with ResNet34 encoder adapted for 3 input channels."""
    model = smp.Unet(
        encoder_name="resnet34",
        encoder_weights="imagenet",
        in_channels=3,
        classes=1,
    )
    return model


def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
) -> float:
    """Train for one epoch and return average loss."""
    model.train()
    total_loss = 0.0
    count = 0

    for images, targets, valid_masks in loader:
        images = images.to(device)
        targets = targets.to(device)
        valid_masks = valid_masks.to(device)

        optimizer.zero_grad()
        logits = model(images)
        loss = criterion(logits, targets, valid_masks)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        count += 1

    return total_loss / max(count, 1)


@torch.no_grad()
def evaluate_validation(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
) -> Dict[str, float]:
    """Evaluate model on validation split and compute true IoU, F1, and Precision/Recall."""
    model.eval()
    tp_total = 0
    fp_total = 0
    fn_total = 0

    for images, targets, valid_masks in loader:
        images = images.to(device)
        targets = targets.to(device)
        valid_masks = valid_masks.to(device)

        logits = model(images)
        probs = torch.sigmoid(logits)
        preds = (probs > 0.5)

        # Apply valid mask (exclude -1 pixels)
        v = valid_masks.bool()
        y_true = targets[v].bool()
        y_pred = preds[v].bool()

        tp = (y_pred & y_true).sum().item()
        fp = (y_pred & ~y_true).sum().item()
        fn = (~y_pred & y_true).sum().item()

        tp_total += tp
        fp_total += fp
        fn_total += fn

    denom_iou = tp_total + fp_total + fn_total
    iou = tp_total / denom_iou if denom_iou > 0 else 0.0

    denom_prec = tp_total + fp_total
    precision = tp_total / denom_prec if denom_prec > 0 else 0.0

    denom_rec = tp_total + fn_total
    recall = tp_total / denom_rec if denom_rec > 0 else 0.0

    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "val_iou": float(iou),
        "val_f1": float(f1),
        "val_precision": float(precision),
        "val_recall": float(recall),
    }


def train_unet(
    epochs: int = 10,
    batch_size: int = 8,
    lr: float = 3e-4,
    device_name: str | None = None,
    output_weights_dir: str = "pipeline/weights",
    max_train_samples: int | None = None,
    max_val_samples: int | None = None,
) -> Dict[str, float]:
    """Execute complete training pipeline and save best weights."""
    set_seed(42)
    device = get_device(device_name)
    print(f"Starting U-Net ResNet34 training on device: {device}")

    # 1. Datasets & Loaders (Train on train split ONLY, evaluate on valid ONLY)
    train_ds = Sen1Floods11Dataset(
        split="train",
        is_train=True,
        crop_size=256,
        max_samples=max_train_samples,
    )
    val_ds = Sen1Floods11Dataset(
        split="valid",
        is_train=False,
        max_samples=max_val_samples,
    )

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=0,
        drop_last=True if len(train_ds) > batch_size else False,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size,
        shuffle=False,
        num_workers=0,
    )

    print(f"Loaded {len(train_ds)} train chips and {len(val_ds)} validation chips.")

    # 2. Model & Loss & Optimizer
    model = create_unet_resnet34().to(device)
    criterion = MaskedDiceBCELoss(bce_weight=0.5, smooth=1.0)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    best_val_iou = 0.0
    weights_dir = Path(output_weights_dir)
    weights_dir.mkdir(parents=True, exist_ok=True)
    best_weights_path = weights_dir / "unet_resnet34.pth"

    best_metrics = {}

    for epoch in range(1, epochs + 1):
        loss = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_metrics = evaluate_validation(model, val_loader, device)
        scheduler.step()

        val_iou = val_metrics["val_iou"]
        print(
            f"Epoch {epoch:02d}/{epochs:02d} | Train Loss: {loss:.4f} | "
            f"Val IoU: {val_iou:.4f} | Val F1: {val_metrics['val_f1']:.4f} | "
            f"Val Prec: {val_metrics['val_precision']:.4f} | Val Rec: {val_metrics['val_recall']:.4f}"
        )

        if val_iou >= best_val_iou:
            best_val_iou = val_iou
            best_metrics = val_metrics
            torch.save(
                {
                    "epoch": epoch,
                    "model_state_dict": model.state_dict(),
                    "val_iou": val_iou,
                    "val_f1": val_metrics["val_f1"],
                    "architecture": "unet_resnet34",
                },
                best_weights_path,
            )
            print(f"--> Saved new best checkpoint (Val IoU: {val_iou:.4f}) to {best_weights_path}")

    return best_metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train U-Net on Sen1Floods11")
    parser.add_argument("--epochs", type=int, default=5, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=3e-4, help="Learning rate")
    parser.add_argument("--device", type=str, default=None, help="Device (cpu, mps, cuda)")
    parser.add_argument("--max-train", type=int, default=None, help="Max train samples")
    parser.add_argument("--max-val", type=int, default=None, help="Max val samples")
    args = parser.parse_args()

    train_unet(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        device_name=args.device,
        max_train_samples=args.max_train,
        max_val_samples=args.max_val,
    )
