#!/usr/bin/env python3
"""JalDrishti Post-Deployment Smoke Test Suite.

Validates deployed live instances of the web frontend (Vercel) and FastAPI backend (Render / Fly).
Runs health checks, asset availability, algorithmic routes, alerts, what-if scenarios, and beacon ingest.

Usage:
    python scripts/smoke_test.py --web-url https://jaldrishti.vercel.app --api-url https://jaldrishti-api.onrender.com
    # Or locally:
    python scripts/smoke_test.py --web-url http://localhost:3000 --api-url http://127.0.0.1:8000
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any


def check_endpoint(
    name: str,
    url: str,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    expected_status: int = 200,
    validator: Any = None,
) -> tuple[bool, int, float, str]:
    """Execute HTTP request against an endpoint and validate response."""
    data_bytes = json.dumps(body).encode("utf-8") if body else None
    headers = {"User-Agent": "JalDrishti-SmokeTest/1.0"}
    if body:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    start_time = time.perf_counter()

    try:
        with urllib.request.urlopen(req, timeout=15.0) as resp:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            status = resp.status
            raw_body = resp.read().decode("utf-8", errors="replace")

            if status != expected_status:
                return False, status, elapsed_ms, f"Expected {expected_status}, got {status}"

            if validator:
                ok, err = validator(raw_body)
                if not ok:
                    return False, status, elapsed_ms, err

            return True, status, elapsed_ms, "OK"
    except urllib.error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return False, e.code, elapsed_ms, f"HTTP Error {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return False, 0, elapsed_ms, f"Connection Failed: {e.reason}"
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return False, 0, elapsed_ms, f"Unexpected error: {str(e)}"


def main() -> int:
    parser = argparse.ArgumentParser(description="JalDrishti Post-Deployment Smoke Test")
    parser.add_argument("--web-url", default="http://localhost:3000", help="Root URL of deployed Next.js web application")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000", help="Root URL of deployed FastAPI backend application")
    args = parser.parse_args()

    web = args.web_url.rstrip("/")
    api = args.api_url.rstrip("/")

    print("=" * 80)
    print("🌊 JalDrishti Smoke Test Suite")
    print(f"Web Frontend: {web}")
    print(f"API Backend:  {api}")
    print("=" * 80)

    tests = [
        # --- Web Frontend Routes ---
        ("Landing Page (/) ", f"{web}/", "GET", None, 200, lambda b: ("JalDrishti" in b, "Missing brand")),
        ("Command Center (/command-center)", f"{web}/command-center", "GET", None, 200, lambda b: ("Barak" in b or "Assam" in b or "Command" in b, "Missing disaster shell")),
        ("About Page (/about)", f"{web}/about", "GET", None, 200, lambda b: ("Copernicus" in b or "Methodology" in b, "Missing attribution text")),
        ("Model Card (/model)", f"{web}/model", "GET", None, 200, lambda b: ("ResNet34" in b or "Sen1Floods11" in b, "Missing model architecture card")),
        ("Rescue Beacon PWA (/beacon)", f"{web}/beacon", "GET", None, 200, lambda b: ("SOS" in b or "Beacon" in b, "Missing PWA SOS controls")),
        ("Beacon Privacy (/beacon/privacy)", f"{web}/beacon/privacy", "GET", None, 200, lambda b: ("DPDP" in b or "Erasure" in b, "Missing privacy content")),
        ("Web App Manifest", f"{web}/manifest.json", "GET", None, 200, lambda b: ("jaldrishti" in b.lower(), "Invalid PWA manifest")),

        # --- FastAPI Backend Routes ---
        ("API Health Check (GET /health)", f"{api}/health", "GET", None, 200, lambda b: (json.loads(b).get("status") == "ok", "status is not 'ok'")),
        ("Event Detail (GET /events/assam-2022)", f"{api}/events/assam-2022", "GET", None, 200, lambda b: (json.loads(b).get("event_id") == "assam-2022", "event_id mismatch")),
        ("Routing Zone 20 (GET /events/.../route?from=zone_20)", f"{api}/events/assam-2022/route?from=zone_20", "GET", None, 200, lambda b: ("status" in json.loads(b), "missing routing status")),
        (
            "Alerts Preview (POST /alerts/preview)",
            f"{api}/alerts/preview",
            "POST",
            {"zone": "zone_20", "severity": "Extreme", "language": "as"},
            200,
            lambda b: ("cap_xml" in json.loads(b) and "text" in json.loads(b), "missing CAP XML or text payload"),
        ),
        ("What-If Scenario (GET /events/.../whatif)", f"{api}/events/assam-2022/whatif?delta_m=0.0", "GET", None, 200, lambda b: (json.loads(b).get("effective_water_level_m") == 1.5, "effective stage mismatch")),
        ("Beacon List (GET /beacons)", f"{api}/beacons", "GET", None, 200, lambda b: (isinstance(json.loads(b), list) and len(json.loads(b)) > 0, "beacons list empty or invalid")),
        (
            "Beacon Ingest (POST /beacons)",
            f"{api}/beacons",
            "POST",
            {"lat": 24.833, "lon": 92.778, "group_size": 2, "need_type": "food", "channel": "online", "note": "Smoke Test SOS"},
            201,
            lambda b: ("id" in json.loads(b) and json.loads(b).get("status") == "new", "beacon creation failed"),
        ),
    ]

    all_passed = True
    results_summary = []

    for name, url, method, body, expected_status, validator in tests:
        ok, status, latency_ms, msg = check_endpoint(name, url, method, body, expected_status, validator)
        if not ok:
            all_passed = False
        tag = "PASS" if ok else "FAIL"
        results_summary.append((tag, name, status, latency_ms, msg))
        status_col = f"[{tag}]"
        print(f"{status_col:7} {name:46} -> HTTP {status:3} ({latency_ms:6.1f} ms) : {msg}")

    print("=" * 80)
    passed_count = sum(1 for r in results_summary if r[0] == "PASS")
    total_count = len(results_summary)

    print(f"Overall Result: {passed_count}/{total_count} Passed ({'100% SUCCESS' if all_passed else 'SOME ENDPOINTS FAILED'})")
    print("=" * 80)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
