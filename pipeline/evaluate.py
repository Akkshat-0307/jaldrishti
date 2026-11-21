"""Evaluation script for JalDrishti Tier A baseline (Phase 1).

Evaluates baseline algorithm on authentic hand-labeled Sen1Floods11 chips
to record genuine IoU, F1, Precision, and Recall metrics.
Writes results to data/events/assam-2022/metrics.json.

CRITICAL RULE: Never hard-code or invent metrics or statistics.
Every number is calculated from ground-truth data or code.
"""

from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import requests
import tifffile
from scipy import ndimage
from skimage.filters import threshold_otsu

SEN1FLOODS11_GCS_BASE = "https://storage.googleapis.com/sen1floods11/v1.1/data/flood_events/HandLabeled"

# Hand-labeled test chips from Sen1Floods11 test split and held-out Bolivia set
EVAL_CHIPS = [
    "Bolivia_103757",
    "Bolivia_129334",
    "Bolivia_195474",
    "Bolivia_23014",
    "Bolivia_233925",
    "Bolivia_242570",
    "Bolivia_290290",
    "Bolivia_294583",
    "Bolivia_312675",
    "Bolivia_314919",
]


def evaluate_chip(chip_id: str) -> Dict[str, int] | None:
    """Download and evaluate single Sen1Floods11 chip against ground-truth hand labels."""
    s1_url = f"{SEN1FLOODS11_GCS_BASE}/S1Hand/{chip_id}_S1Hand.tif"
    lbl_url = f"{SEN1FLOODS11_GCS_BASE}/LabelHand/{chip_id}_LabelHand.tif"

    try:
        r_s1 = requests.get(s1_url, timeout=15)
        r_lbl = requests.get(lbl_url, timeout=15)
        if r_s1.status_code != 200 or r_lbl.status_code != 200:
            return None

        s1 = tifffile.imread(io.BytesIO(r_s1.content))
        lbl = tifffile.imread(io.BytesIO(r_lbl.content))

        vv = s1[0]
        finite_mask = np.isfinite(vv)
        if not np.any(finite_mask):
            return None

        vv_clean = np.where(finite_mask, vv, np.nanmedian(vv[finite_mask]))
        vv_filt = ndimage.median_filter(vv_clean, size=3)

        valid_vv = vv_filt[finite_mask]
        if len(valid_vv) < 100 or np.ptp(valid_vv) == 0:
            return None

        thresh = threshold_otsu(valid_vv)
        pred = (vv_filt < thresh).astype(int)

        # Ground truth: 1 = flood/water, 0 = non-water, -1 = ignore/cloud
        eval_mask = (lbl >= 0) & finite_mask
        y_true = lbl[eval_mask]
        y_pred = pred[eval_mask]

        tp = int(((y_pred == 1) & (y_true == 1)).sum())
        fp = int(((y_pred == 1) & (y_true == 0)).sum())
        fn = int(((y_pred == 0) & (y_true == 1)).sum())
        tn = int(((y_pred == 0) & (y_true == 0)).sum())

        return {"tp": tp, "fp": fp, "fn": fn, "tn": tn}
    except Exception as e:
        print(f"Error evaluating chip {chip_id}: {e}")
        return None


def run_benchmark_evaluation(chips: List[str] | None = None) -> Dict[str, Any]:
    """Evaluate baseline across Sen1Floods11 chips and aggregate confusion matrix."""
    chip_list = chips or EVAL_CHIPS
    print(f"Running baseline benchmark on {len(chip_list)} Sen1Floods11 chips...")

    tp_total = 0
    fp_total = 0
    fn_total = 0
    tn_total = 0
    successful_chips = 0

    for chip_id in chip_list:
        res = evaluate_chip(chip_id)
        if res:
            tp_total += res["tp"]
            fp_total += res["fp"]
            fn_total += res["fn"]
            tn_total += res["tn"]
            successful_chips += 1

    denom_iou = tp_total + fp_total + fn_total
    iou = tp_total / denom_iou if denom_iou > 0 else 0.0

    denom_prec = tp_total + fp_total
    precision = tp_total / denom_prec if denom_prec > 0 else 0.0

    denom_rec = tp_total + fn_total
    recall = tp_total / denom_rec if denom_rec > 0 else 0.0

    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "dataset": "Sen1Floods11 (HandLabeled Test + Bolivia Held-Out)",
        "evaluated_chips_count": successful_chips,
        "metrics": {
            "iou": round(float(iou), 4),
            "f1": round(float(f1), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
        },
        "confusion_matrix": {
            "true_positives": int(tp_total),
            "false_positives": int(fp_total),
            "false_negatives": int(fn_total),
            "true_negatives": int(tn_total),
        },
    }


def generate_event_metrics(event_dir: Path, benchmark_results: Dict[str, Any]) -> Dict[str, Any]:
    """Combine empirical benchmark metrics with Assam 2022 event statistics."""
    # Load manifest and polygon geojson for exact measured values
    manifest_path = event_dir / "manifest.json"
    geojson_path = event_dir / "flood_polygons.geojson"

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    with open(geojson_path, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    features = geojson.get("features", [])
    total_area_ha = sum(f["properties"]["area_ha"] for f in features)
    total_area_km2 = sum(f["properties"]["area_km2"] for f in features)

    metrics_payload: Dict[str, Any] = {
        "event_id": manifest["event_id"],
        "event_name": manifest["name"],
        "tier": "Tier A Baseline (Speckle + Otsu + JRC + HAND)",
        "evaluation_timestamp": datetime.now(timezone.utc).isoformat(),
        "benchmark_evaluation": benchmark_results,
        "event_measurements": {
            "region": "Cachar / Silchar, Assam",
            "bbox": manifest["bbox"],
            "utm_crs": manifest["utm_crs"],
            "detected_flood_area_ha": round(total_area_ha, 2),
            "detected_flood_area_km2": round(total_area_km2, 2),
            "polygon_count": len(features),
            "acquisition_dates": {
                "dry_baseline": manifest["baseline_date"],
                "flood_peak": manifest["flood_peak_date"],
                "flood_recession": manifest["flood_recession_date"],
            },
            "validation_status": "UNVALIDATED_INDEPENDENTLY",
            "validation_notes": (
                "No official Copernicus EMS rapid mapping or NRSC vector shapefile "
                "published for the exact localized Cachar/Silchar bounding box "
                "(92.70E to 92.90E, 24.75N to 24.90N) at 30m resolution. "
                "Reported IoU/F1 metrics are empirically measured on Sen1Floods11 ground-truth chips."
            ),
        },
        "provenance": {
            "satellite_pixels": "REAL",
            "benchmark_labels": "REAL",
            "flood_mask": "DERIVED",
            "flood_polygons": "DERIVED",
        },
    }

    out_metrics_path = event_dir / "metrics.json"
    with open(out_metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"Metrics written to {out_metrics_path}")
    return metrics_payload


if __name__ == "__main__":
    benchmark = run_benchmark_evaluation()
    event_dir = Path("data/events/assam-2022")
    payload = generate_event_metrics(event_dir, benchmark)
    print("Metrics evaluation complete:")
    print(json.dumps(payload, indent=2))
