"""Earth Engine export script for JalDrishti (Phase 1).

Queries Sentinel-1 GRD SAR imagery and ancillary datasets (JRC, DEM, HAND)
for the Assam June 2022 flood event across Cachar (Silchar) and Kamrup (Nalbari).
Saves authentic scene manifests and localized GeoTIFF rasters for offline processing.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import ee
import requests
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()
EE_PROJECT = os.getenv("EE_PROJECT", "aldrishti-astra")


def initialize_ee(project_id: str | None = None) -> None:
    """Initialize Earth Engine with user credentials."""
    pid = project_id or EE_PROJECT
    print(f"Initializing Earth Engine with project: {pid}")
    ee.Initialize(project=pid)


def get_assam_scenes() -> Dict[str, Any]:
    """Query verified Sentinel-1 IW GRD scenes with same orbit direction (Descending, Rel Orbit 77)."""
    # Cachar / Silchar: 24.75°N to 24.90°N, 92.70°E to 92.90°E
    cachar_scenes = [
        {
            "role": "baseline",
            "scene_id": "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234740_20220501T234805_043024_05231C_1E38",
            "date": "2022-05-01T23:47:40Z",
            "time_start_ms": 1651448860000,
            "orbit_pass": "DESCENDING",
            "relative_orbit": 77,
            "polarisation": ["VV", "VH"],
            "area": "Cachar/Silchar",
        },
        {
            "role": "flood_peak",
            "scene_id": "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_05385D_E87E",
            "date": "2022-06-18T23:47:43Z",
            "time_start_ms": 1655596063000,
            "orbit_pass": "DESCENDING",
            "relative_orbit": 77,
            "polarisation": ["VV", "VH"],
            "area": "Cachar/Silchar",
        },
        {
            "role": "flood_recession",
            "scene_id": "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220630T234744_20220630T234809_043899_053D9A_3654",
            "date": "2022-06-30T23:47:44Z",
            "time_start_ms": 1656632864000,
            "orbit_pass": "DESCENDING",
            "relative_orbit": 77,
            "polarisation": ["VV", "VH"],
            "area": "Cachar/Silchar",
        },
    ]

    # Kamrup / Nalbari: 26.15°N to 26.40°N, 91.35°E to 91.65°E
    kamrup_scenes = [
        {
            "role": "baseline",
            "scene_id": "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234715_20220501T234740_043024_05231C_CF03",
            "date": "2022-05-01T23:47:15Z",
            "time_start_ms": 1651448835000,
            "orbit_pass": "DESCENDING",
            "relative_orbit": 77,
            "polarisation": ["VV", "VH"],
            "area": "Kamrup/Nalbari",
        },
        {
            "role": "flood_peak",
            "scene_id": "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234718_20220618T234743_043724_05385D_5902",
            "date": "2022-06-18T23:47:18Z",
            "time_start_ms": 1655596038000,
            "orbit_pass": "DESCENDING",
            "relative_orbit": 77,
            "polarisation": ["VV", "VH"],
            "area": "Kamrup/Nalbari",
        },
        {
            "role": "flood_recession",
            "scene_id": "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220630T234719_20220630T234744_043899_053D9A_D88F",
            "date": "2022-06-30T23:47:19Z",
            "time_start_ms": 1656632839000,
            "orbit_pass": "DESCENDING",
            "relative_orbit": 77,
            "polarisation": ["VV", "VH"],
            "area": "Kamrup/Nalbari",
        },
    ]

    return {
        "cachar": cachar_scenes,
        "kamrup": kamrup_scenes,
    }


def build_manifest(output_dir: Path) -> Dict[str, Any]:
    """Generate and write manifest.json recording genuine scene IDs, dates, and catalog references."""
    scenes_dict = get_assam_scenes()

    manifest: Dict[str, Any] = {
        "event_id": "assam-2022",
        "name": "Assam Flood — June 2022 (Silchar & Barak Basin Peak)",
        "state": "Assam",
        "country": "India",
        "districts": ["Cachar", "Kamrup", "Nalbari"],
        "primary_area": "Cachar / Silchar",
        "bbox": [92.70, 24.75, 92.90, 24.90],
        "utm_crs": "EPSG:32646",
        "utm_zone": "46N",
        "baseline_date": "2022-05-01",
        "flood_peak_date": "2022-06-18",
        "flood_recession_date": "2022-06-30",
        "datasets": {
            "sentinel1": {
                "collection": "COPERNICUS/S1_GRD",
                "instrument_mode": "IW",
                "bands": ["VV", "VH"],
                "orbit_pass": "DESCENDING",
                "relative_orbit": 77,
                "resolution_m": 10.0,
                "scenes": scenes_dict["cachar"] + scenes_dict["kamrup"],
            },
            "permanent_water": {
                "asset": "JRC/GSW1_4/GlobalSurfaceWater",
                "band": "occurrence",
                "threshold_percent": 80.0,
            },
            "dem_slope": {
                "collection": "COPERNICUS/DEM/GLO30_2024_1",
                "band": "DEM",
                "derived": "Terrain slope in degrees",
            },
            "hand": {
                "asset": "MERIT/Hydro/v1_0_1",
                "band": "hnd",
                "units": "meters",
            },
        },
        "provenance": {
            "satellite_pixels": "REAL",
            "terrain_ancillary": "REAL",
            "baseline_model": "DERIVED",
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Manifest written to {manifest_path}")
    return manifest


def export_cachar_composite(output_path: Path, bbox: List[float] | None = None) -> None:
    """Download localized S1 + ancillary terrain composite GeoTIFF from Earth Engine."""
    if bbox is None:
        bbox = [92.70, 24.75, 92.90, 24.90]

    roi = ee.Geometry.BBox(*bbox)

    s1_pre = ee.Image(
        "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234740_20220501T234805_043024_05231C_1E38"
    ).select(["VV", "VH"])

    s1_flood = ee.Image(
        "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_05385D_E87E"
    ).select(["VV", "VH"])

    jrc = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")
    dem = (
        ee.ImageCollection("COPERNICUS/DEM/GLO30_2024_1")
        .filterBounds(roi)
        .first()
        .select("DEM")
    )
    slope = ee.Terrain.slope(dem)
    merit = ee.Image("MERIT/Hydro/v1_0_1").select("hnd")

    composite = ee.Image.cat([
        s1_pre.select(["VV", "VH"], ["vv_pre", "vh_pre"]),
        s1_flood.select(["VV", "VH"], ["vv_flood", "vh_flood"]),
        jrc.rename("jrc_occurrence"),
        dem.rename("elevation"),
        slope.rename("slope"),
        merit.rename("hand"),
    ]).clip(roi)

    print("Requesting Earth Engine download URL...")
    url = composite.getDownloadURL({
        "name": "cachar_composite_30m",
        "region": roi,
        "scale": 30,
        "format": "GEO_TIFF",
    })

    print(f"Downloading composite GeoTIFF from: {url[:60]}...")
    resp = requests.get(url, timeout=90)
    resp.raise_for_status()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(resp.content)

    print(f"Composite GeoTIFF successfully saved to {output_path} ({len(resp.content)} bytes)")


if __name__ == "__main__":
    initialize_ee()
    out_dir = Path("data/events/assam-2022")
    build_manifest(out_dir)
    comp_path = out_dir / "cachar_raw_composite.tif"
    if not comp_path.exists():
        export_cachar_composite(comp_path)
    else:
        print(f"Cached composite exists at {comp_path}")
