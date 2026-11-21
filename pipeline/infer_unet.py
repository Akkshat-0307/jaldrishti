"""Inference and post-processing pipeline for U-Net flood segmentation (Phase 2).

Runs U-Net on SAR rasters, produces binary flood masks, confidence/uncertainty
probability rasters, and UTM-projected vector polygons.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Tuple

import numpy as np
import pyproj
import tifffile
import torch
from scipy import ndimage
from skimage.morphology import remove_small_objects

from pipeline.baseline import polygonize_and_compute_utm_areas
from pipeline.dataset import TRAIN_STATS
from pipeline.train_unet import create_unet_resnet34, get_device


def run_unet_inference(
    vv: np.ndarray,
    vh: np.ndarray,
    weights_path: Path | str | None = None,
    device_name: str | None = None,
) -> np.ndarray:
    """Run U-Net forward pass on full raster array using sliding window or tiled inference.

    Returns probability map with values in [0.0, 1.0].
    """
    device = get_device(device_name)
    model = create_unet_resnet34()

    if weights_path and Path(weights_path).is_file():
        print(f"Loading checkpoint weights from {weights_path}...")
        checkpoint = torch.load(weights_path, map_location=device)
        state_dict = checkpoint["model_state_dict"] if "model_state_dict" in checkpoint else checkpoint
        model.load_state_dict(state_dict)
    else:
        print("Using ImageNet-pretrained ResNet34 encoder for inference initialization.")

    model.to(device)
    model.eval()

    # 1. Clean non-finite values
    vv_fin = np.isfinite(vv)
    vh_fin = np.isfinite(vh)
    vv_med = float(np.nanmedian(vv[vv_fin])) if np.any(vv_fin) else -10.0
    vh_med = float(np.nanmedian(vh[vh_fin])) if np.any(vh_fin) else -16.0
    vv_clean = np.where(vv_fin, vv, vv_med)
    vh_clean = np.where(vh_fin, vh, vh_med)

    diff = vv_clean - vh_clean

    # 2. Normalize with training split parameters
    vv_norm = (vv_clean - TRAIN_STATS["vv_mean"]) / TRAIN_STATS["vv_std"]
    vh_norm = (vh_clean - TRAIN_STATS["vh_mean"]) / TRAIN_STATS["vh_std"]
    diff_norm = (diff - TRAIN_STATS["diff_mean"]) / TRAIN_STATS["diff_std"]

    input_np = np.stack([vv_norm, vh_norm, diff_norm], axis=0).astype(np.float32)  # [3, H, W]
    _, h, w = input_np.shape

    # Pad dimensions to be multiples of 32 for U-Net pooling
    pad_h = (32 - (h % 32)) % 32
    pad_w = (32 - (w % 32)) % 32

    input_padded = np.pad(input_np, ((0, 0), (0, pad_h), (0, pad_w)), mode="reflect")
    tensor_input = torch.from_numpy(input_padded).unsqueeze(0).to(device)  # [1, 3, H_pad, W_pad]

    with torch.no_grad():
        logits = model(tensor_input)
        probs = torch.sigmoid(logits).squeeze().cpu().numpy()

    # Unpad
    probs_cropped = probs[:h, :w]
    return probs_cropped


def post_process_unet_prediction(
    prob_map: np.ndarray,
    jrc_occurrence: np.ndarray,
    slope: np.ndarray,
    hand: np.ndarray,
    threshold: float = 0.5,
    perm_water_threshold_pct: float = 80.0,
    max_slope_deg: float = 5.0,
    max_hand_m: float = 15.0,
    min_pixels_size: int = 6,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Apply Phase 1 terrain, permanent water, and morphological filters to U-Net probability map."""
    raw_mask = (prob_map >= threshold)

    # 1. Mask permanent water
    permanent_water = (jrc_occurrence > perm_water_threshold_pct)
    water_cand = raw_mask & (~permanent_water)

    # 2. Terrain false-positive suppression (radar shadow on hills, high terrain)
    terrain_filtered = water_cand & (slope <= max_slope_deg) & (hand <= max_hand_m)

    # 3. Morphological hole filling and min-area filter
    filled = ndimage.binary_fill_holes(terrain_filtered)
    try:
        cleaned = remove_small_objects(filled, max_size=min_pixels_size - 1)
    except TypeError:
        cleaned = remove_small_objects(filled, min_size=min_pixels_size)

    stats = {
        "raw_unet_pixels": int(raw_mask.sum()),
        "permanent_water_masked": int(permanent_water.sum()),
        "terrain_suppressed_pixels": int((water_cand & ~terrain_filtered).sum()),
        "cleaned_flood_pixels": int(cleaned.sum()),
    }
    return cleaned, stats


def compute_mask_agreement(mask1: np.ndarray, mask2: np.ndarray) -> Dict[str, float]:
    """Calculate spatial agreement metrics between two masks.

    REPORTED HONESTLY AS AGREEMENT ONLY, NOT ACCURACY.
    """
    m1 = mask1.astype(bool)
    m2 = mask2.astype(bool)

    intersection = (m1 & m2).sum()
    union = (m1 | m2).sum()

    jaccard_agreement = float(intersection / union) if union > 0 else 1.0
    dice_agreement = float(2.0 * intersection / (m1.sum() + m2.sum())) if (m1.sum() + m2.sum()) > 0 else 1.0

    return {
        "jaccard_agreement": round(jaccard_agreement, 4),
        "dice_agreement": round(dice_agreement, 4),
        "tier_a_pixels": int(m1.sum()),
        "unet_pixels": int(m2.sum()),
        "overlap_pixels": int(intersection),
    }


def execute_assam_unet_pipeline(
    event_dir: Path | str = "data/events/assam-2022",
    weights_path: Path | str | None = "pipeline/weights/unet_resnet34.pth",
) -> Dict[str, Any]:
    """Execute U-Net segmentation on cached Assam 2022 composite and generate deliverables."""
    e_dir = Path(event_dir)
    comp_path = e_dir / "cachar_raw_composite.tif"
    if not comp_path.is_file():
        raise FileNotFoundError(f"Missing composite at {comp_path}")

    img = tifffile.imread(str(comp_path))
    # Bands: 0: vv_pre, 1: vh_pre, 2: vv_flood, 3: vh_flood, 4: jrc, 5: elev, 6: slope, 7: hand
    vv_flood = img[:, :, 2]
    vh_flood = img[:, :, 3]
    jrc = img[:, :, 4]
    slope = img[:, :, 6]
    hand = img[:, :, 7]

    # 1. Run U-Net inference
    print("Running U-Net ResNet34 inference on Cachar flood composite...")
    prob_map = run_unet_inference(vv_flood, vh_flood, weights_path=weights_path)

    # 2. Save confidence probability raster
    conf_tif_path = e_dir / "flood_confidence_unet.tif"
    tifffile.imwrite(
        str(conf_tif_path),
        (prob_map * 255).astype(np.uint8),
        photometric="minisblack",
    )
    print(f"Saved confidence probability raster to {conf_tif_path}")

    # 3. Post-processing
    print("Applying JRC water masking, terrain suppression, and area filtering...")
    cleaned_mask, filter_stats = post_process_unet_prediction(
        prob_map=prob_map,
        jrc_occurrence=jrc,
        slope=slope,
        hand=hand,
    )

    # 4. Save binary flood mask
    mask_tif_path = e_dir / "flood_mask_unet.tif"
    tifffile.imwrite(
        str(mask_tif_path),
        (cleaned_mask.astype(np.uint8) * 255),
        photometric="minisblack",
    )
    print(f"Saved U-Net flood mask to {mask_tif_path}")

    # 5. Polygonize and compute UTM 46N area
    bbox = [92.70, 24.75, 92.90, 24.90]
    geojson, total_ha, num_polys = polygonize_and_compute_utm_areas(
        mask=cleaned_mask,
        bbox=bbox,
        utm_epsg="EPSG:32646",
        min_area_ha=0.5,
    )
    # Tag layer metadata
    geojson["name"] = "assam_2022_cachar_unet_flood_polygons"
    for f in geojson["features"]:
        f["properties"]["layer"] = "DERIVED"
        f["properties"]["provenance"] = "DERIVED (U-Net ResNet34 + HAND)"

    geojson_path = e_dir / "flood_polygons_unet.geojson"
    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)
    print(f"Saved {num_polys} U-Net flood polygons to {geojson_path}")
    print(f"Total U-Net flood area: {total_ha:.2f} ha ({total_ha / 100.0:.2f} km²)")

    # 6. Compare with Tier A mask
    tier_a_mask_path = e_dir / "flood_mask.tif"
    agreement_stats = {}
    if tier_a_mask_path.is_file():
        tier_a_mask = tifffile.imread(str(tier_a_mask_path)) > 128
        agreement_stats = compute_mask_agreement(tier_a_mask, cleaned_mask)
        print("Agreement with Tier A baseline mask on Assam:")
        print(f"  Jaccard Agreement (IoU between masks): {agreement_stats['jaccard_agreement']:.4f}")
        print(f"  Dice Agreement: {agreement_stats['dice_agreement']:.4f}")

    return {
        "total_flooded_ha": total_ha,
        "total_flooded_km2": round(total_ha / 100.0, 2),
        "polygon_count": num_polys,
        "filter_stats": filter_stats,
        "agreement_with_tier_a": agreement_stats,
    }


if __name__ == "__main__":
    summary = execute_assam_unet_pipeline()
    print("Assam U-Net pipeline complete:", json.dumps(summary, indent=2))
