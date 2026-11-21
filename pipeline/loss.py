"""Masked Dice + BCE Loss function for flood segmentation.

Accommodates -1 (no-data / cloud / edge) pixels by strictly masking them
out of both the BCE gradient and the soft Dice overlap calculation.
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class MaskedDiceBCELoss(nn.Module):
    """Combined BCE + Dice loss with no-data masking support."""

    def __init__(self, bce_weight: float = 0.5, smooth: float = 1.0) -> None:
        super().__init__()
        self.bce_weight = bce_weight
        self.smooth = smooth

    def forward(
        self,
        pred_logits: torch.Tensor,
        targets: torch.Tensor,
        valid_mask: torch.Tensor,
    ) -> torch.Tensor:
        """Compute masked loss.

        Args:
            pred_logits: Tensor of shape [B, 1, H, W] (raw logits)
            targets: Tensor of shape [B, 1, H, W] (0.0 or 1.0)
            valid_mask: Tensor of shape [B, 1, H, W] (True for valid pixels, False for -1)
        """
        mask_f = valid_mask.float()
        valid_count = mask_f.sum()
        if valid_count < 1.0:
            return torch.tensor(0.0, device=pred_logits.device, requires_grad=True)

        # 1. Masked Binary Cross-Entropy
        bce = F.binary_cross_entropy_with_logits(pred_logits, targets, reduction="none")
        bce_loss = (bce * mask_f).sum() / valid_count

        # 2. Masked Soft Dice Loss
        probs = torch.sigmoid(pred_logits) * mask_f
        targets_m = targets * mask_f

        intersection = (probs * targets_m).sum(dim=(-2, -1))
        union = probs.sum(dim=(-2, -1)) + targets_m.sum(dim=(-2, -1))

        dice = 1.0 - (2.0 * intersection + self.smooth) / (union + self.smooth)
        dice_loss = dice.mean()

        total_loss = self.bce_weight * bce_loss + (1.0 - self.bce_weight) * dice_loss
        return total_loss
