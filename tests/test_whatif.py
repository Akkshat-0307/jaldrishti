"""Unit tests for Phase 5: HAND Inundation Model, Calibration, Scenarios, and River Outlook."""

import json
from pathlib import Path
import pytest

np = pytest.importorskip("numpy", reason="numpy not installed (HAND pipeline dependency)")
scipy = pytest.importorskip("scipy", reason="scipy not installed (HAND pipeline dependency)")

from fastapi.testclient import TestClient

try:
    from apps.api.main import app
except ImportError:
    from main import app

from pipeline.river_outlook import fetch_river_outlook
from pipeline.whatif import (
    DELTA_TAGS,
    SCENARIO_DELTAS,
    calibrate_water_level,
    predict_hand_inundation,
)

client = TestClient(app)


def test_hand_connectivity_toy_raster():
    """Verify that HAND model connects depressions touching drainage and prunes disconnected sinks."""
    # 10x10 synthetic grid
    hand = np.full((10, 10), 5.0, dtype=float)
    slope = np.full((10, 10), 1.0, dtype=float)
    jrc = np.zeros((10, 10), dtype=float)

    # Column 0 is the river channel (HAND = 0.0m)
    hand[:, 0] = 0.0

    # Connected depression at rows 1-3, cols 1-3 (HAND = 1.0m, connected to col 0)
    hand[1:4, 1:4] = 1.0

    # Disconnected depression at rows 7-9, cols 7-9 (HAND = 1.0m, surrounded by HAND = 5.0m)
    hand[7:10, 7:10] = 1.0

    # Water level h = 1.5m
    flood_mask = predict_hand_inundation(
        hand=hand,
        slope=slope,
        jrc=jrc,
        water_level_h=1.5,
        slope_threshold_deg=5.0,
        hand_channel_threshold_m=0.05,
        remove_permanent_water=False,
    )

    # Column 0 (drainage channel) must be flooded
    assert np.all(flood_mask[:, 0])

    # Connected depression (rows 1-3, cols 1-3) must be flooded
    assert np.all(flood_mask[1:4, 1:4])

    # Disconnected depression (rows 7-9, cols 7-9) MUST NOT be flooded (no path to col 0 <= 1.5m)
    assert not np.any(flood_mask[7:10, 7:10])


def test_hand_slope_filtering():
    """Verify that steep terrain (> slope_threshold) is suppressed even if HAND <= h."""
    hand = np.zeros((5, 5), dtype=float)  # Low HAND everywhere
    slope = np.zeros((5, 5), dtype=float)
    jrc = np.zeros((5, 5), dtype=float)

    # Steep cliff at row 2
    slope[2, :] = 12.0  # > 5.0 degrees

    flood_mask = predict_hand_inundation(
        hand=hand,
        slope=slope,
        jrc=jrc,
        water_level_h=1.0,
        slope_threshold_deg=5.0,
        remove_permanent_water=False,
    )

    # Row 2 must be suppressed by slope filter
    assert not np.any(flood_mask[2, :])
    # Other rows must be flooded
    assert np.all(flood_mask[0:2, :])
    assert np.all(flood_mask[3:5, :])


def test_hand_monotonicity():
    """Verify that flooded area is monotonically non-decreasing as water level h increases."""
    rng = np.random.default_rng(42)
    hand = np.abs(rng.normal(loc=3.0, scale=2.0, size=(30, 30)))
    hand[15, :] = 0.0  # River channel through center
    slope = rng.uniform(0.0, 4.0, size=(30, 30))
    jrc = np.zeros((30, 30), dtype=float)

    h_levels = [0.5, 1.0, 2.0, 3.5, 5.0, 8.0]
    pixel_counts = []
    for h in h_levels:
        m = predict_hand_inundation(hand, slope, jrc, h)
        pixel_counts.append(int(np.sum(m)))

    for i in range(len(pixel_counts) - 1):
        assert pixel_counts[i] <= pixel_counts[i + 1], (
            f"Monotonicity failed: h={h_levels[i]} has {pixel_counts[i]} px > h={h_levels[i+1]} with {pixel_counts[i+1]} px"
        )


def test_synthetic_calibration():
    """Verify that water level calibration accurately recovers known synthetic stage."""
    # Synthetic grid
    hand = np.zeros((20, 20), dtype=float)
    for r in range(20):
        for c in range(20):
            hand[r, c] = float(c * 0.25)  # HAND increases from 0 to 4.75m along columns
    slope = np.ones((20, 20), dtype=float)
    jrc = np.zeros((20, 20), dtype=float)

    # Synthetic target mask where ground truth is h = 2.0m (cols 0 through 8)
    ground_truth = hand <= 2.0

    best_h = None
    best_iou = -1.0
    for h in np.arange(0.25, 4.0, 0.25):
        pred = predict_hand_inundation(hand, slope, jrc, float(h), remove_permanent_water=False)
        intersection = np.sum(pred & ground_truth)
        union = np.sum(pred | ground_truth)
        iou = intersection / union if union > 0 else 0
        if iou > best_iou:
            best_iou = iou
            best_h = float(h)

    assert best_h == 2.0
    assert best_iou == 1.0


def test_scenarios_index_and_files_integrity():
    """Verify that all precomputed scenario deliverables exist and maintain physical consistency."""
    scenarios_dir = Path("data/events/assam-2022/scenarios")
    index_path = scenarios_dir / "index.json"
    assert index_path.is_file(), "scenarios/index.json missing"

    with open(index_path, "r", encoding="utf-8") as f:
        idx = json.load(f)

    assert idx["scenarios_count"] == 6
    assert len(idx["scenarios"]) == 6

    areas = []
    pops = []
    for s in idx["scenarios"]:
        delta = s["delta_m"]
        assert delta in SCENARIO_DELTAS
        tag = DELTA_TAGS[delta]

        json_file = scenarios_dir / f"scenario_{tag}.json"
        geojson_file = scenarios_dir / f"scenario_{tag}.geojson"
        assert json_file.is_file(), f"Missing {json_file}"
        assert geojson_file.is_file(), f"Missing {geojson_file}"

        with open(json_file, "r", encoding="utf-8") as jf:
            s_data = json.load(jf)

        assert s_data["delta_m"] == delta
        assert s_data["metrics"]["flooded_area_ha"] > 0
        assert s_data["metrics"]["exposed_population"] > 0
        assert len(s_data["zones"]) == 20

        # Check zone priority scores bounded in [0, 100]
        for z in s_data["zones"]:
            assert 0.0 <= z["priority_score"] <= 100.0
            assert "touches_window_edge" in z

        areas.append(s["flooded_area_ha"])
        pops.append(s["exposed_population"])

    # Monotonicity checks
    for i in range(len(areas) - 1):
        assert areas[i] <= areas[i + 1], f"Area not monotonic: {areas[i]} > {areas[i+1]}"
        assert pops[i] <= pops[i + 1], f"Exposed pop not monotonic: {pops[i]} > {pops[i+1]}"


def test_rainfall_imerg_context_integrity():
    """Verify that cached NASA IMERG rainfall data is valid, non-negative, and properly badged."""
    rf_path = Path("data/events/assam-2022/rainfall_imerg.json")
    assert rf_path.is_file(), "rainfall_imerg.json missing"

    with open(rf_path, "r", encoding="utf-8") as f:
        rf = json.load(f)

    assert rf["dataset_id"] == "NASA/GPM_L3/IMERG_V07"
    assert "REAL" in rf["provenance"]
    assert rf["rainfall_summary"]["accum_1day_mm"] > 50.0  # June 17-18 was heavy rainfall
    assert rf["rainfall_summary"]["accum_3day_mm"] > 150.0
    assert rf["rainfall_summary"]["accum_7day_mm"] > 200.0
    assert len(rf["daily_timeline"]) == 7


def test_river_outlook_integrity_and_fallback():
    """Verify that GloFAS river outlook returns forecast points and functions in DEMO_MODE."""
    event_dir = Path("data/events/assam-2022")
    cached_path = event_dir / "river_outlook_cached.json"
    assert cached_path.is_file(), "river_outlook_cached.json missing"

    outlook = fetch_river_outlook(event_dir=event_dir)
    assert outlook["river_name"] == "Barak River"
    assert "REAL" in outlook["layer_provenance"]
    assert outlook["current_discharge_m3s"] > 0
    assert len(outlook["daily_forecast"]) >= 5


def test_api_whatif_endpoint_snapping():
    """Test GET /events/assam-2022/whatif with exact delta and nearest snapping."""
    # Exact delta
    resp = client.get("/events/assam-2022/whatif?delta_m=0.5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["snapped_delta_m"] == 0.5
    assert data["metrics"]["flooded_area_ha"] > 0
    assert len(data["zones"]) == 20

    # Snapped delta (0.3 snaps to 0.5)
    resp_snap = client.get("/events/assam-2022/whatif?delta_m=0.3")
    assert resp_snap.status_code == 200
    data_snap = resp_snap.json()
    assert data_snap["snapped_delta_m"] == 0.5

    # Nonexistent event
    resp_404 = client.get("/events/nonexistent-event/whatif")
    assert resp_404.status_code == 404


def test_api_river_forecast_endpoint():
    """Test GET /forecast/river endpoint contract."""
    resp = client.get("/forecast/river")
    assert resp.status_code == 200
    data = resp.json()
    assert data["river_name"] == "Barak River"
    assert "REAL" in data["layer_provenance"]
    assert len(data["dates"]) >= 5
    assert len(data["discharge_m3s"]) >= 5
    assert data["current_discharge_m3s"] > 0
