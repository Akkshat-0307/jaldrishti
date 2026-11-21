"""Unit tests for Phase 2: U-Net flood segmentation, dataset loader, metrics, and loss."""

import pytest

np = pytest.importorskip("numpy", reason="numpy not installed (heavy ML dependency)")
torch = pytest.importorskip("torch", reason="torch not installed (heavy ML dependency)")

from pipeline.dataset import TRAIN_STATS
from pipeline.infer_unet import compute_mask_agreement
from pipeline.loss import MaskedDiceBCELoss
from pipeline.train_unet import create_unet_resnet34


def test_unet_output_shape():
    """Verify U-Net forward pass produces correct [B, 1, H, W] tensor shape."""
    model = create_unet_resnet34()
    model.eval()

    # Input: batch of 2, 3 channels (VV, VH, VV-VH), 256x256
    dummy_input = torch.randn(2, 3, 256, 256)
    with torch.no_grad():
        output = model(dummy_input)

    assert output.shape == (2, 1, 256, 256), f"Expected (2, 1, 256, 256), got {output.shape}"
    assert torch.isfinite(output).all(), "Output logits contains non-finite values"


def test_masked_dice_bce_loss_nodata_invariance():
    """Verify that pixels masked as invalid (-1 / False) do not affect loss or gradients."""
    criterion = MaskedDiceBCELoss(bce_weight=0.5, smooth=1.0)

    # 1 batch, 1 channel, 4x4
    logits = torch.zeros(1, 1, 4, 4, requires_grad=True)
    targets = torch.zeros(1, 1, 4, 4)
    targets[0, 0, 0, 0] = 1.0  # (0,0) is positive flood

    # Only top row is valid; bottom 3 rows are invalid (cloud/no-data)
    valid_mask = torch.zeros(1, 1, 4, 4)
    valid_mask[0, 0, 0, :] = 1.0

    loss1 = criterion(logits, targets, valid_mask)
    loss1.backward()
    grad1 = logits.grad.clone()

    # Reset gradient and change target in INVALID region
    logits.grad.zero_()
    targets_altered = targets.clone()
    targets_altered[0, 0, 3, 3] = 1.0  # Changed in masked-out invalid region

    loss2 = criterion(logits, targets_altered, valid_mask)
    loss2.backward()
    grad2 = logits.grad.clone()

    # Losses and valid gradients must be identical
    assert torch.isclose(loss1, loss2), f"Loss should be invariant to invalid pixels: {loss1} vs {loss2}"
    assert torch.allclose(grad1[0, 0, 0, :], grad2[0, 0, 0, :]), "Gradients in valid region must match"
    assert torch.all(grad1[0, 0, 1:, :] == 0.0), "Gradients in invalid region must be zero"


def test_metric_functions_on_toy_arrays():
    """Verify precision, recall, F1, and IoU calculations on known toy ground-truth masks."""
    # 4x4 ground truth: 4 true positives
    y_true = np.array([
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ], dtype=bool)

    # Prediction: 3 TP, 1 FN (at 1,1), 1 FP (at 2,2)
    y_pred = np.array([
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 0],
    ], dtype=bool)

    # TP = 3, FP = 1, FN = 1
    # IoU = 3 / (3 + 1 + 1) = 3/5 = 0.60
    # Precision = 3 / (3 + 1) = 0.75
    # Recall = 3 / (3 + 1) = 0.75
    # F1 = 2 * (0.75 * 0.75) / (1.5) = 0.75

    agreement = compute_mask_agreement(y_true, y_pred)
    assert agreement["jaccard_agreement"] == 0.6
    assert agreement["dice_agreement"] == 0.75
    assert agreement["overlap_pixels"] == 3


def test_train_stats_integrity():
    """Ensure train normalization parameters are strictly finite and realistic for Sentinel-1 dB."""
    assert "vv_mean" in TRAIN_STATS
    assert "vh_mean" in TRAIN_STATS
    assert "diff_mean" in TRAIN_STATS

    # VV mean in dB is typically between -15 dB and -5 dB
    assert -20.0 < TRAIN_STATS["vv_mean"] < 0.0
    # VH mean in dB is typically lower than VV
    assert TRAIN_STATS["vh_mean"] < TRAIN_STATS["vv_mean"]
    # Standard deviations must be strictly positive
    assert TRAIN_STATS["vv_std"] > 0
    assert TRAIN_STATS["vh_std"] > 0
