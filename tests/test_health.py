"""Test the /health endpoint."""

from fastapi.testclient import TestClient


def test_health_returns_200() -> None:
    """GET /health should return 200 with expected fields."""
    from main import app  # noqa: WPS433 — imported here so conftest path setup runs first

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert "demo_mode" in body
    assert "data_version" in body


def test_health_demo_mode_flag() -> None:
    """DEMO_MODE env var should be reflected in the response."""
    from main import app

    client = TestClient(app)
    body = client.get("/health").json()

    # conftest.py sets DEMO_MODE=1
    assert body["demo_mode"] is True
