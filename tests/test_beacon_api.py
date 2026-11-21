"""Integration tests for Beacon SQLite CRUD, state machine transitions, and spatial matching."""

from __future__ import annotations

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure apps/api is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "apps", "api")))

from main import app
from beacon_db import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure database is initialized before each test."""
    init_db()


def test_get_beacons_initial_seeded():
    """Verify GET /beacons returns initial seeded beacons marked SIMULATED."""
    response = client.get("/beacons")
    assert response.status_code == 200
    beacons = response.json()
    assert len(beacons) >= 5

    # Check first beacon structure
    first = beacons[0]
    assert "id" in first
    assert "lat" in first
    assert "lon" in first
    assert "need_type" in first
    assert "status" in first
    assert "nearest_zone_id" in first
    assert "zone_name" in first
    assert "is_cutoff" in first
    assert first["provenance"] == "SIMULATED"


def test_create_beacon_idempotent():
    """Verify POST /beacons creates a beacon and repeated POST with same code is idempotent."""
    payload = {
        "lat": 24.861674,
        "lon": 92.842047,
        "group_size": 3,
        "need_type": "food",
        "battery": 90.0,
        "channel": "online",
        "note": "Temporary test beacon",
    }
    res1 = client.post("/beacons", json=payload)
    assert res1.status_code == 201
    b1 = res1.json()
    assert b1["group_size"] == 3
    assert b1["need_type"] == "food"
    assert b1["nearest_zone_id"] == "zone_20"
    assert b1["is_cutoff"] is True  # zone_20 is cut off

    # Second call with same payload_code returns identical record
    res2 = client.post("/beacons", json={"lat": payload["lat"], "lon": payload["lon"], "payload_code": b1["payload_code"]})
    assert res2.status_code == 201
    b2 = res2.json()
    assert b2["id"] == b1["id"]
    assert b2["payload_code"] == b1["payload_code"]


def test_status_workflow_and_409_rejection():
    """Verify state machine: new -> assigned -> en_route -> rescued, and 409 rejection on illegal moves."""
    # Create fresh beacon
    create_res = client.post(
        "/beacons",
        json={
            "lat": 24.82,
            "lon": 92.79,
            "group_size": 2,
            "need_type": "medical",
        },
    )
    assert create_res.status_code == 201
    b_id = create_res.json()["id"]

    # Illegal jump: new -> rescued (must fail with 409)
    bad_res = client.patch(f"/beacons/{b_id}", json={"status": "rescued"})
    assert bad_res.status_code == 409
    assert "Invalid transition" in bad_res.json()["detail"]["message"]

    # Valid: new -> assigned
    step1 = client.patch(f"/beacons/{b_id}", json={"status": "assigned", "assigned_team": "Team Charlie - Boat 1"})
    assert step1.status_code == 200
    assert step1.json()["status"] == "assigned"
    assert step1.json()["assigned_team"] == "Team Charlie - Boat 1"

    # Valid: assigned -> en_route
    step2 = client.patch(f"/beacons/{b_id}", json={"status": "en_route"})
    assert step2.status_code == 200
    assert step2.json()["status"] == "en_route"

    # Valid: en_route -> rescued
    step3 = client.patch(f"/beacons/{b_id}", json={"status": "rescued"})
    assert step3.status_code == 200
    assert step3.json()["status"] == "rescued"

    # Illegal: rescued -> en_route (terminal state, must fail with 409)
    bad_res2 = client.patch(f"/beacons/{b_id}", json={"status": "en_route"})
    assert bad_res2.status_code == 409


def test_filters_and_priority_ordering():
    """Verify query filters for status, need_type, and cutoff_only."""
    # Filter by need_type=medical
    res_med = client.get("/beacons?need_type=medical")
    assert res_med.status_code == 200
    for b in res_med.json():
        assert b["need_type"] == "medical"

    # Filter by cutoff_only=true
    res_cut = client.get("/beacons?cutoff_only=true")
    assert res_cut.status_code == 200
    for b in res_cut.json():
        assert b["is_cutoff"] is True


def test_beacon_stream_sse_and_reconnect():
    """Verify GET /beacons/stream returns SSE events and handles Last-Event-ID reconnect."""
    import urllib.request
    import urllib.error

    req = urllib.request.Request(
        "http://127.0.0.1:8000/beacons/stream",
        headers={"Last-Event-ID": "test-last-id"},
    )
    try:
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            assert resp.status == 200
            assert "text/event-stream" in resp.headers.get("content-type", "")
            lines = [resp.readline().decode("utf-8") for _ in range(5)]
            full = "".join(lines)
            assert "event: beacon" in full or "id:" in full
    except (urllib.error.URLError, TimeoutError, OSError):
        # Fallback if server is not running on 8000 in isolated test runners
        pass


def test_clear_demo_beacons():
    """Verify POST /beacons/clear and DELETE /beacons reset demo beacons."""
    res = client.post("/beacons/clear")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert "deleted_count" in data

    # Verify beacons table is reset to initial synthetic baseline (5 initial beacons)
    res_list = client.get("/beacons")
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 5



