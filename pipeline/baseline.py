"""Tier A baseline flood detection for JalDrishti (Phase 1).

Implements:
1. Speckle filtering (3x3 median filter)
2. Change detection (post - pre < -3.0 dB)
3. Otsu automated thresholding on post-flood SAR VV
4. Post-processing false-positive suppression:
   - Permanent water masking (JRC Occurrence > 80%)
   - Radar shadow & steep terrain suppression (Slope > 5° or HAND > 15m)
   - Morphological cleanup (hole filling, min-area filter < 0.5 ha)
5. Vector polygonization and area calculation in projected UTM Zone 46N (EPSG:32646).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pyproj
import tifffile
from scipy import ndimage
from skimage import measure
from skimage.filters import threshold_otsu
from skimage.morphology import remove_small_objects
from shapely.geometry import Polygon, mapping
from shapely.ops import transform


def apply_speckle_filter(band: np.ndarray, size: int = 3) -> np.ndarray:
    """Apply median filter for SAR speckle reduction."""
    return ndimage.median_filter(band, size=size)


def compute_otsu_threshold(band: np.ndarray) -> float:
    """Compute Otsu threshold on valid radar backscatter pixels."""
    valid_pixels = band[~np.isnan(band) & ~np.isinf(band)]
    if len(valid_pixels) == 0:
        return -14.0
    return float(threshold_otsu(valid_pixels))


def detect_flood_pixels(
    vv_pre: np.ndarray,
    vv_flood: np.ndarray,
    jrc_occurrence: np.ndarray,
    slope: np.ndarray,
    hand: np.ndarray,
    change_threshold_db: float = -3.0,
    perm_water_threshold_pct: float = 80.0,
    max_slope_deg: float = 5.0,
    max_hand_m: float = 15.0,
    min_pixels_size: int = 6,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """Run full Tier A pipeline on SAR & ancillary arrays.
    
    Returns binary flood mask (True = flood) and diagnostic metrics.
    """
    # 1. Speckle filtering
    vv_pre_filt = apply_speckle_filter(vv_pre, size=3)
    vv_flood_filt = apply_speckle_filter(vv_flood, size=3)

    # 2. Change detection
    delta_vv = vv_flood_filt - vv_pre_filt

    # 3. Automated Otsu threshold
    otsu_val = compute_otsu_threshold(vv_flood_filt)

    # 4. Combined water candidate
    candidate = (delta_vv < change_threshold_db) | (vv_flood_filt < otsu_val)

    # 5. Permanent water mask (JRC)
    permanent_water = jrc_occurrence > perm_water_threshold_pct

    # 6. Terrain false positive suppression
    flood_cand = candidate & (~permanent_water)
    flood_terrain = flood_cand & (slope <= max_slope_deg) & (hand <= max_hand_m)

    # 7. Morphological cleanup
    filled = ndimage.binary_fill_holes(flood_terrain)
    # Remove blobs smaller than min_pixels_size (approx 0.5 ha at 30m resolution)
    try:
        cleaned = remove_small_objects(filled, max_size=min_pixels_size - 1)
    except TypeError:
        cleaned = remove_small_objects(filled, min_size=min_pixels_size)

    stats = {
        "otsu_threshold_db": round(otsu_val, 2),
        "candidate_water_pixels": int(candidate.sum()),
        "permanent_water_pixels": int(permanent_water.sum()),
        "terrain_suppressed_pixels": int((flood_cand & ~flood_terrain).sum()),
        "cleaned_flood_pixels": int(cleaned.sum()),
    }
    return cleaned, stats


def polygonize_and_compute_utm_areas(
    mask: np.ndarray,
    bbox: List[float],
    utm_epsg: str = "EPSG:32646",
    min_area_ha: float = 0.5,
) -> Tuple[Dict[str, Any], float, int]:
    """Convert binary raster mask to GeoJSON polygons with areas computed in UTM CRS.
    
    CRITICAL RULE: Areas are strictly computed in projected UTM CRS (EPSG:32646),
    never in geographic EPSG:4326.
    """
    transformer = pyproj.Transformer.from_crs("EPSG:4326", utm_epsg, always_xy=True)

    rows, cols = mask.shape
    lon_min, lat_min, lon_max, lat_max = bbox
    dlon = (lon_max - lon_min) / cols
    dlat = (lat_max - lat_min) / rows

    contours = measure.find_contours(mask.astype(float), 0.5)

    features: List[Dict[str, Any]] = []
    total_area_m2 = 0.0

    for i, c in enumerate(contours):
        coords_wgs84: List[Tuple[float, float]] = []
        for r, col in c:
            lat = lat_max - r * dlat
            lon = lon_min + col * dlon
            coords_wgs84.append((lon, lat))

        if len(coords_wgs84) < 4:
            continue

        # Close polygon ring if open
        if coords_wgs84[0] != coords_wgs84[-1]:
            coords_wgs84.append(coords_wgs84[0])

        try:
            poly_wgs = Polygon(coords_wgs84)
            if not poly_wgs.is_valid:
                poly_wgs = poly_wgs.buffer(0)
            if poly_wgs.is_empty:
                continue

            # Project to UTM to compute area
            poly_utm = transform(transformer.transform, poly_wgs)
            area_m2 = poly_utm.area
            area_ha = area_m2 / 10000.0

            if area_ha < min_area_ha:
                continue

            total_area_m2 += area_m2

            feature = {
                "type": "Feature",
                "id": f"flood_poly_{i+1}",
                "geometry": mapping(poly_wgs),
                "properties": {
                    "polygon_id": i + 1,
                    "layer": "DERIVED",
                    "provenance": "DERIVED (Tier A Speckle + Otsu + HAND)",
                    "area_m2": round(area_m2, 2),
                    "area_ha": round(area_ha, 2),
                    "area_km2": round(area_ha / 100.0, 4),
                    "utm_crs": utm_epsg,
                },
            }
            features.append(feature)
        except Exception:
            continue

    geojson: Dict[str, Any] = {
        "type": "FeatureCollection",
        "name": "assam_2022_cachar_flood_polygons",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": features,
    }

    total_area_ha = round(total_area_m2 / 10000.0, 2)
    return geojson, total_area_ha, len(features)


def run_tier_a_pipeline(event_dir: Path) -> Dict[str, Any]:
    """Execute Tier A baseline processing on event data directory."""
    comp_path = event_dir / "cachar_raw_composite.tif"
    if not comp_path.exists():
        raise FileNotFoundError(f"Missing composite file at {comp_path}")

    print(f"Loading {comp_path}...")
    img = tifffile.imread(str(comp_path))
    # Bands: 0: vv_pre, 1: vh_pre, 2: vv_flood, 3: vh_flood, 4: jrc, 5: elev, 6: slope, 7: hand
    vv_pre = img[:, :, 0]
    vv_flood = img[:, :, 2]
    jrc = img[:, :, 4]
    slope = img[:, :, 6]
    hand = img[:, :, 7]

    print("Executing speckle filter, change detection, Otsu, and terrain gating...")
    mask, stats = detect_flood_pixels(
        vv_pre=vv_pre,
        vv_flood=vv_flood,
        jrc_occurrence=jrc,
        slope=slope,
        hand=hand,
    )

    # Save flood_mask.tif as uint8 GeoTIFF
    mask_tif_path = event_dir / "flood_mask.tif"
    tifffile.imwrite(
        str(mask_tif_path),
        (mask.astype(np.uint8) * 255),
        photometric="minisblack",
    )
    print(f"Saved binary flood mask to {mask_tif_path}")

    # Polygonize and compute areas in UTM EPSG:32646
    bbox = [92.70, 24.75, 92.90, 24.90]
    geojson, total_ha, num_polygons = polygonize_and_compute_utm_areas(
        mask=mask,
        bbox=bbox,
        utm_epsg="EPSG:32646",
        min_area_ha=0.5,
    )

    geojson_path = event_dir / "flood_polygons.geojson"
    with open(geojson_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2)
    print(f"Saved {num_polygons} flood polygons to {geojson_path}")
    print(f"Total flood extent in Cachar/Silchar: {total_ha:.2f} ha ({total_ha / 100.0:.2f} km²)")

    summary = {
        **stats,
        "total_flooded_ha": total_ha,
        "total_flooded_km2": round(total_ha / 100.0, 2),
        "polygon_count": num_polygons,
        "utm_crs": "EPSG:32646",
    }
    return summary


if __name__ == "__main__":
    event_path = Path("data/events/assam-2022")
    summary = run_tier_a_pipeline(event_path)
    print("Baseline execution summary:", json.dumps(summary, indent=2))
