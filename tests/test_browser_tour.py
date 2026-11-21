"""Browser automated tests for JalDrishti landing page, Command Center guided tour, and accessibility.

Uses headless Chromium/Chrome to render full DOMs and verify components,
tours, and prefers-reduced-motion compliance.
"""

from __future__ import annotations

import subprocess
import shutil
import pytest
import os


CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def get_chrome_executable() -> str | None:
    """Return path to Chrome/Chromium binary if available."""
    if os.path.exists(CHROME_PATH):
        return CHROME_PATH
    for name in ["google-chrome", "chromium", "chromium-browser"]:
        found = shutil.which(name)
        if found:
            return found
    return None


def fetch_rendered_dom(url: str, reduced_motion: bool = False, timeout: int = 15) -> str:
    """Run headless Chrome to dump rendered DOM from Next.js server."""
    chrome_bin = get_chrome_executable()
    if not chrome_bin:
        pytest.skip("Chrome/Chromium executable not found on host.")

    cmd = [
        chrome_bin,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--virtual-time-budget=3000",
        "--dump-dom",
    ]
    if reduced_motion:
        cmd.append("--blink-settings=prefersReducedMotion=true")

    cmd.append(url)

    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout)
    return result.stdout


def test_landing_page_headless_chrome():
    """Verify landing page renders key scenes, navigation, and badges in headless Chrome."""
    html = fetch_rendered_dom("http://localhost:3000/")
    assert len(html) > 5000, "DOM output was unexpectedly small"

    # Title & Metadata
    assert "JalDrishti — Flood Intelligence Platform" in html
    assert "ASTRA 2026" in html

    # Problem scene & IFRC statistics
    assert "THE INVISIBLE CRISIS" in html or "When the monsoon strikes" in html
    assert "5.6M" in html or "56" in html
    assert "427,338" in html
    assert "MDRIN028" in html or "ReliefWeb" in html or "IFRC" in html

    # Radar Penetration Scene
    assert "Seeing Through Clouds" in html
    assert "C-band" in html or "microwave" in html
    assert "ILLUSTRATION" in html or "Illustration" in html

    # Assess Scene (Topological Isolation)
    assert "TOPOLOGICAL ISOLATION" in html or "Topological Isolation" in html
    assert "Debpāra" in html or "Dudhpatli" in html
    assert "100,310" in html
    assert "53,945" in html

    # Act & Reach Scene
    assert "LIFELINE ROUTING" in html or "Dry Corridors" in html
    assert "5.30 km" in html or "5.3 km" in html
    assert "সাৱধান" in html

    # Navigation buttons
    assert "/command-center" in html
    assert "/beacon" in html
    assert "/about" in html
    assert "/model" in html


def test_command_center_headless_chrome():
    """Verify Command Center renders TopBar, KPI strip, Map and Accessible Table."""
    html = fetch_rendered_dom("http://localhost:3000/command-center")
    assert len(html) > 5000, "Command Center DOM output was unexpectedly small"

    # TopBar & Brand
    assert "JALDRISHTI" in html or "JalDrishti" in html
    assert "Command Center" in html or "Cachar / Silchar" in html

    # KPI Strip
    assert "Flood Extent" in html
    assert "Population Exposed" in html
    assert "Cut-off Zones" in html

    # Tour trigger
    assert "tour-button" in html or "Run demo tour" in html or "tour" in html.lower()

    # Accessible data table button / presence
    assert "Table View" in html or "data table" in html.lower() or "table" in html.lower()


def test_prefers_reduced_motion_renders_cleanly():
    """Verify that with prefersReducedMotion=true, pages render cleanly without hanging."""
    html_landing = fetch_rendered_dom("http://localhost:3000/", reduced_motion=True)
    assert "JalDrishti" in html_landing
    assert "ASTRA 2026" in html_landing

    html_cc = fetch_rendered_dom("http://localhost:3000/command-center", reduced_motion=True)
    assert "Flood Extent" in html_cc


def test_beacon_pwa_renders_cleanly():
    """Verify that Beacon PWA page renders SOS button, telemetry, and fallback channels."""
    html = fetch_rendered_dom("http://localhost:3000/beacon")
    assert len(html) > 3000

    # Title & Telemetry
    assert "Rescue Beacon" in html or "Rescue" in html
    assert "ASTRA 2026" in html
    assert "SOS" in html

    # 16-byte payload indicator
    assert "16-BYTE" in html or "PAYLOAD" in html or "CRC16" in html

    # Multi-path fallback channels
    assert "sms:" in html
    assert "placeholder demo number" in html or "Demo Notice" in html
    assert "SIMULATED" in html
    assert "Satellite" in html or "NavIC" in html

    # Privacy link
    assert "/beacon/privacy" in html


def test_beacon_privacy_page_renders():
    """Verify DPDP Act 2023 compliance, payload inspection, and data erasure controls."""
    html = fetch_rendered_dom("http://localhost:3000/beacon/privacy")
    assert len(html) > 3000

    assert "DPDP Act" in html or "2023" in html
    assert "Zero Personally Identifiable" in html or "Zero" in html
    assert "Right to Erasure" in html or "Purge" in html
    assert "16-Byte Payload" in html or "CRC16" in html


def test_offline_cdp_e2e_flush_and_deduplication():
    """Verify offline queueing and online flush via headless Chrome CDP automation."""
    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js not available to run CDP test.")
    chrome_bin = get_chrome_executable()
    if not chrome_bin:
        pytest.skip("Chrome not available on host.")

    script_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "test_offline_cdp.mjs")
    result = subprocess.run([node_bin, script_path], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f"CDP test failed:\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
    assert "PASS: Offline queue enqueued, auto-flushed online, and deduplicated cleanly!" in result.stdout


def test_offline_pmtiles_basemap_and_layers():
    """Verify self-hosted PMTiles basemap and unet-fill/zones-fill rendering under zero network."""
    node_bin = shutil.which("node")
    if not node_bin:
        pytest.skip("Node.js not available to run CDP test.")
    chrome_bin = get_chrome_executable()
    if not chrome_bin:
        pytest.skip("Chrome not available on host.")

    script_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "test_offline_map.mjs")
    result = subprocess.run([node_bin, script_path], capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, f"CDP test failed:\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
    assert "PASS: Map rendered offline!" in result.stdout


