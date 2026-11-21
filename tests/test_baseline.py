"""Tests for Tier A baseline detection, thresholding, and UTM area calculation."""

from __future__ import annotations

import math
import numpy as np
import pytest
from shapely.geometry import Polygon
from shapely.ops import transform
import pyproj

from pipeline.baseline import (
    apply_speckle_filter,
    compute_otsu_threshold,
    detect_flood_pixels,
    polygonize_and_compute_utm_areas,
)


def test_speckle_filter() -> None:
    """Speckle filter should reduce isolated noise while preserving shape."""
    img = np.ones((20, 20), dtype=float) * 10.0
    img[10, 10] = 100.0  # isolated spike
    filtered = apply_speckle_filter(img, size=3)
    assert filtered.shape == (20, 20)
    assert filtered[10, 10] < 50.0  # spike smoothed out


def test_compute_otsu_threshold() -> None:
    """Otsu threshold should split bimodal distribution of land and water."""
    np.random.seed(42)
    water_pixels = np.random.normal(loc=-18.0, scale=1.5, size=500)
    land_pixels = np.random.normal(loc=-8.0, scale=1.5, size=500)
    combined = np.concatenate([water_pixels, land_pixels])

    thresh = compute_otsu_threshold(combined)
    assert -15.0 < thresh < -11.0


def test_compute_otsu_threshold_nan_handling() -> None:
    """Otsu should handle arrays containing NaNs or Infs gracefully."""
    arr = np.array([np.nan, -18.0, -17.0, -6.0, -5.0, np.inf])
    thresh = compute_otsu_threshold(arr)
    assert -19.0 <= thresh <= -5.0


def test_detect_flood_pixels_logic() -> None:
    """Verifies that change detection, Otsu, permanent water, and terrain gating work."""
    shape = (50, 50)
    # Default baseline land
    vv_pre = np.full(shape, -8.0, dtype=float)
    vv_flood = np.full(shape, -8.0, dtype=float)
    jrc = np.zeros(shape, dtype=float)
    slope = np.zeros(shape, dtype=float)
    hand = np.zeros(shape, dtype=float)

    # 1. Real flood inundation region (rows 10-25, cols 10-25):
    # backscatter drops from -8 dB to -18 dB (drop of 10 dB)
    vv_flood[10:25, 10:25] = -18.0

    # 2. Permanent water body (rows 35-40, cols 35-40):
    # low backscatter both before and during, JRC = 95%
    vv_pre[35:40, 35:40] = -19.0
    vv_flood[35:40, 35:40] = -19.0
    jrc[35:40, 35:40] = 95.0

    # 3. Steep hillside / radar shadow false positive (rows 5-8, cols 5-8):
    # low backscatter on flood date, but slope = 15° and HAND = 25m
    vv_flood[5:8, 5:8] = -20.0
    slope[5:8, 5:8] = 15.0
    hand[5:8, 5:8] = 25.0

    mask, stats = detect_flood_pixels(
        vv_pre=vv_pre,
        vv_flood=vv_flood,
        jrc_occurrence=jrc,
        slope=slope,
        hand=hand,
        change_threshold_db=-3.0,
        perm_water_threshold_pct=80.0,
        max_slope_deg=5.0,
        max_hand_m=15.0,
        min_pixels_size=4,
    )

    # Flooded region should be detected
    assert mask[15, 15] == True
    # Permanent water should be masked out
    assert mask[37, 37] == False
    # Steep slope radar shadow should be suppressed
    assert mask[6, 6] == False

    assert stats["permanent_water_pixels"] > 0
    assert stats["terrain_suppressed_pixels"] > 0
    assert stats["cleaned_flood_pixels"] > 0


def test_utm_projected_area_not_epsg4326() -> None:
    """CRITICAL AGENTS.MD RULE: Compute areas in projected UTM, never in EPSG:4326.
    
    A ~1km x 1km square in Assam (lat 24.83, lon 92.80) has an area of ~1,000,000 m² (~100 ha).
    If calculated directly in EPSG:4326 degrees², it would be ~0.00008, which is completely invalid.
    This test verifies that the UTM transformation correctly measures ~100 ha.
    """
    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:32646", always_xy=True)

    lon0, lat0 = 92.80, 24.83
    # Approx 1 km offsets in degrees at lat 24.83
    dlat = 1.0 / 110.8
    dlon = 1.0 / 100.8

    poly_deg = Polygon([
        (lon0, lat0),
        (lon0 + dlon, lat0),
        (lon0 + dlon, lat0 + dlat),
        (lon0, lat0 + dlat),
        (lon0, lat0),
    ])

    # In degrees², area is tiny and meaningless for physical metric
    area_deg2 = poly_deg.area
    assert area_deg2 < 0.001

    # In UTM Zone 46N (EPSG:32646), area is in square meters
    poly_utm = transform(transformer.transform, poly_deg)
    area_m2 = poly_utm.area
    area_ha = area_m2 / 10000.0

    # Expected ~100 ha within 1% tolerance
    assert 99.0 <= area_ha <= 101.5
    assert 990000.0 <= area_m2 <= 1015000.0
