"""Verification tests for Phase 7: Landing page scroll story, about page, and model card."""

import json
import os
from pathlib import Path
import pytest

requests = pytest.importorskip("requests", reason="requests not installed (web integration test)")

BASE_URL = "http://localhost:3000"
REPO_ROOT = Path(__file__).resolve().parent.parent


def _is_web_server_up() -> bool:
    try:
        res = requests.get(f"{BASE_URL}/", timeout=1)
        return res.status_code == 200
    except Exception:
        return False


def test_landing_static_assets_exist():
    """Verify all real satellite and composite images generated for Phase 7 exist."""
    landing_dir = REPO_ROOT / "apps/web/public/assets/landing"
    expected_assets = [
        "s1_baseline.png",
        "s1_peak.png",
        "s1_recession.png",
        "optical_cloud.png",
        "flood_overlay_peak.png",
        "flood_overlay_recession.png",
    ]
    for asset in expected_assets:
        asset_path = landing_dir / asset
        assert asset_path.exists(), f"Missing required asset: {asset}"
        assert asset_path.stat().st_size > 1000, f"Asset {asset} is suspiciously small: {asset_path.stat().st_size} bytes"


def test_landing_page_renders_all_scenes():
    """Verify landing page at http://localhost:3000/ contains all 9 narrative scenes and key data."""
    if not _is_web_server_up():
        pytest.skip(f"Web server not running at {BASE_URL} (skipping landing integration test)")
    res = requests.get(f"{BASE_URL}/", timeout=10)
    assert res.status_code == 200, f"Landing page returned status {res.status_code}"
    html = res.text

    # Scene 0 / Brand
    assert "JALDRISHTI" in html or "JAL" in html
    assert "ASTRA 2026" in html

    # Scene 1: Hero
    assert "From satellite pixel to last-mile rescue" in html or "From satellite pixel" in html
    assert "Launch Command Center" in html

    # Scene 2: Problem
    assert "THE INVISIBLE CRISIS" in html or "When the monsoon strikes" in html
    assert "5.6M" in html or "56" in html
    assert "427,338" in html
    assert "IFRC" in html or "MDRIN028" in html

    # Scene 3: Radar Penetration
    assert "Seeing Through Clouds" in html
    assert "C-band" in html
    assert "5.6 cm" in html
    assert "Sentinel-1 SAR" in html

    # Scene 4: Detect
    assert "Deep Learning Flood Segmentation" in html
    assert "0.6804" in html  # U-Net Test IoU
    assert "0.8098" in html  # U-Net Test F1
    assert "0.6879" in html  # Bolivia IoU
    assert "0.2168" in html  # Tier A Baseline IoU

    # Scene 5: Predict
    assert "HYDROLOGIC WHAT-IF" in html or "Terrain Hydrology" in html
    assert "DERIVED PLANNING AID" in html or "Relative comparison only" in html

    # Scene 6: Assess
    assert "TOPOLOGICAL ISOLATION" in html or "Topological Isolation" in html
    assert "Debpāra" in html or "Dudhpatli" in html
    assert "100,310" in html
    assert "53,945" in html

    # Scene 7: Act and Reach
    assert "LIFELINE ROUTING" in html or "Dry Corridors" in html
    assert "5.30 km" in html or "5.3 km" in html
    assert "সাৱধান" in html  # Assamese alert text
    assert "0x01A39F4C" in html  # 16-byte packed hex

    # Scene 8: Proof
    assert "SCIENTIFIC RIGOR" in html or "Measured Benchmarks" in html
    assert "Sen1Floods11" in html

    # Scene 9: Launch
    assert "/command-center" in html
    assert "/about" in html
    assert "/model" in html


def test_about_page_attributions_and_governance():
    """Verify /about page contains all open data attributions, licenses, and governance definitions."""
    if not _is_web_server_up():
        pytest.skip(f"Web server not running at {BASE_URL} (skipping about page integration test)")
    res = requests.get(f"{BASE_URL}/about", timeout=10)
    assert res.status_code == 200, f"/about returned status {res.status_code}"
    html = res.text

    assert "Copernicus Sentinel-1" in html
    assert "WorldPop" in html
    assert "ESA WorldCover" in html
    assert "OpenStreetMap" in html
    assert "JRC Global Surface Water" in html
    assert "MERIT Hydro" in html
    assert "CC BY 4.0" in html
    assert "ODbL" in html

    # Data governance badges
    assert "REAL" in html
    assert "DERIVED" in html
    assert "SIMULATED" in html

    # 4 Operational Limitations
    assert "2D Road Graph" in html
    assert "Study Window Boundary Truncation" in html
    assert "Revisit Latency" in html
    assert "What-If Planning Aid Status" in html


def test_model_card_page_metrics_integrity():
    """Verify /model page renders docs/MODEL_CARD.md data faithfully with exact numbers."""
    if not _is_web_server_up():
        pytest.skip(f"Web server not running at {BASE_URL} (skipping model card integration test)")
    res = requests.get(f"{BASE_URL}/model", timeout=10)
    assert res.status_code == 200, f"/model returned status {res.status_code}"
    html = res.text

    # Architecture & Checkpoint
    assert "ResNet34" in html
    assert "segmentation_models_pytorch" in html
    assert "0.6405" in html  # val_iou

    # Splits
    assert "252 Chips" in html
    assert "89 Chips" in html
    assert "88 Chips" in html
    assert "15 Chips" in html

    # Benchmark numbers
    assert "0.6804" in html
    assert "0.8098" in html
    assert "0.6917" in html
    assert "0.8178" in html
    assert "0.2168" in html

    # Failure cases
    assert "Bolivia_195474" in html
    assert "Bolivia_233925" in html
    assert "Ghana_141271" in html
