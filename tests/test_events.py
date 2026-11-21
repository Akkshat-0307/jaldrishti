"""Tests for the /events and /events/{id} endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_list_events_includes_assam() -> None:
    from main import app

    client = TestClient(app)
    response = client.get("/events")
    assert response.status_code == 200

    events = response.json()
    assert isinstance(events, list)
    event_ids = [e["event_id"] for e in events]
    assert "assam-2022" in event_ids


def test_get_event_assam_2022_detail() -> None:
    from main import app

    client = TestClient(app)
    response = client.get("/events/assam-2022")
    assert response.status_code == 200

    data = response.json()
    assert data["event_id"] == "assam-2022"
    assert "Silchar" in data["name"] or "Assam" in data["name"]
    assert "bbox" in data
    assert len(data["bbox"]) == 4
    assert len(data["sentinel1_scenes"]) >= 3
    assert data["baseline_date"] == "2022-05-01"
    assert "2022-06-18" in data["flood_dates"]

    # Verify metrics structure
    assert "metrics" in data
    metrics = data["metrics"]
    assert metrics is not None
    assert "ablation_table" in metrics or "benchmark_evaluation" in metrics
    assert "event_measurements" in metrics or "assam_event_measurements" in metrics
    measurements = metrics.get("event_measurements") or metrics.get("assam_event_measurements")
    assert measurements["validation_status"] == "UNVALIDATED_INDEPENDENTLY" if "validation_status" in measurements else True

    # Verify tile URLs include U-Net deliverables
    assert "tile_urls" in data
    assert "flood_polygons_geojson" in data["tile_urls"]


def test_get_nonexistent_event_returns_404() -> None:
    from main import app

    client = TestClient(app)
    response = client.get("/events/nonexistent-event-999")
    assert response.status_code == 404
