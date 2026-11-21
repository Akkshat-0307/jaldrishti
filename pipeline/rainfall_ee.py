"""Extract NASA GPM IMERG V07 precipitation metrics for Cachar/Silchar, Assam.

Earth Engine Dataset: NASA/GPM_L3/IMERG_V07 (half-hourly, 0.1 deg).
Band: 'precipitation' (mm/hr).
Each half-hour image: precipitation * 0.5 = accumulation in mm.
Study bbox: [92.70, 24.75, 92.90, 24.90] (Cachar, Assam).
Target Event Date: 2022-06-18 (Peak Flood Detection Scene).
Accumulation Periods:
  - 1-day (24h): 2022-06-17T00:00:00 to 2022-06-18T00:00:00 UTC
  - 3-day (72h): 2022-06-15T00:00:00 to 2022-06-18T00:00:00 UTC
  - 7-day (168h): 2022-06-11T00:00:00 to 2022-06-18T00:00:00 UTC

Output: data/events/assam-2022/rainfall_imerg.json
Mirrored to: apps/web/public/data/events/assam-2022/rainfall_imerg.json
Layer Provenance: REAL (Satellite Observation, NASA GPM IMERG V07)
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import ee
from dotenv import load_dotenv

BBOX_CACHAR = [92.70, 24.75, 92.90, 24.90]


def extract_imerg_rainfall(
    event_dir: Path | str = "data/events/assam-2022",
) -> Dict[str, Any]:
    """Extract NASA IMERG precipitation statistics for Cachar study window."""
    load_dotenv()
    project_id = os.getenv("EE_PROJECT", "aldrishti-astra")

    print(f"Initializing Earth Engine with project: {project_id}...")
    ee.Initialize(project=project_id)

    region = ee.Geometry.Rectangle(BBOX_CACHAR)
    col = ee.ImageCollection("NASA/GPM_L3/IMERG_V07").select("precipitation")

    print("Querying IMERG V07 collections for 1-day, 3-day, and 7-day accumulation...")
    # 1-day, 3-day, 7-day image sums (mm/hr * 0.5 hr = mm)
    img_1d = col.filterDate("2022-06-17", "2022-06-18").sum().multiply(0.5)
    img_3d = col.filterDate("2022-06-15", "2022-06-18").sum().multiply(0.5)
    img_7d = col.filterDate("2022-06-11", "2022-06-18").sum().multiply(0.5)

    reducer = ee.Reducer.mean().combine(ee.Reducer.minMax(), sharedInputs=True)

    stats_1d = img_1d.reduceRegion(reducer=reducer, geometry=region, scale=10000).getInfo()
    stats_3d = img_3d.reduceRegion(reducer=reducer, geometry=region, scale=10000).getInfo()
    stats_7d = img_7d.reduceRegion(reducer=reducer, geometry=region, scale=10000).getInfo()

    # Extract daily series for 7 days preceding the event
    daily_series = []
    start_date = "2022-06-11"
    end_date = "2022-06-18"
    day_col = col.filterDate(start_date, end_date)

    # Accumulate by individual 24h days
    days = [
        ("2022-06-11", "2022-06-12"),
        ("2022-06-12", "2022-06-13"),
        ("2022-06-13", "2022-06-14"),
        ("2022-06-14", "2022-06-15"),
        ("2022-06-15", "2022-06-16"),
        ("2022-06-16", "2022-06-17"),
        ("2022-06-17", "2022-06-18"),
    ]

    for d_start, d_end in days:
        d_img = col.filterDate(d_start, d_end).sum().multiply(0.5)
        d_val = d_img.reduceRegion(reducer=ee.Reducer.mean(), geometry=region, scale=10000).getInfo()
        precip_mm = round(float(d_val.get("precipitation", 0.0)), 2)
        daily_series.append({
            "date": d_start,
            "rainfall_mm": precip_mm,
        })

    payload = {
        "event_id": "assam-2022",
        "dataset_id": "NASA/GPM_L3/IMERG_V07",
        "provenance": "REAL (Satellite Observation, NASA GPM IMERG V07)",
        "spatial_resolution": "0.1 degree (~10 km)",
        "temporal_resolution": "30 minutes",
        "region_bbox": BBOX_CACHAR,
        "region_name": "Cachar / Silchar, Assam",
        "reference_date": "2022-06-18",
        "timestamp_extracted": datetime.now(timezone.utc).isoformat(),
        "rainfall_summary": {
            "accum_1day_mm": round(float(stats_1d.get("precipitation_mean", 0.0)), 2),
            "accum_1day_min_mm": round(float(stats_1d.get("precipitation_min", 0.0)), 2),
            "accum_1day_max_mm": round(float(stats_1d.get("precipitation_max", 0.0)), 2),
            "accum_3day_mm": round(float(stats_3d.get("precipitation_mean", 0.0)), 2),
            "accum_3day_min_mm": round(float(stats_3d.get("precipitation_min", 0.0)), 2),
            "accum_3day_max_mm": round(float(stats_3d.get("precipitation_max", 0.0)), 2),
            "accum_7day_mm": round(float(stats_7d.get("precipitation_mean", 0.0)), 2),
            "accum_7day_min_mm": round(float(stats_7d.get("precipitation_min", 0.0)), 2),
            "accum_7day_max_mm": round(float(stats_7d.get("precipitation_max", 0.0)), 2),
        },
        "daily_timeline": daily_series,
        "methodological_note": (
            "Precipitation data derived from the official NASA GPM IMERG V07 half-hourly product "
            "(NASA/GPM_L3/IMERG_V07). Half-hourly precipitation rates (mm/hr) were integrated (multiplied by 0.5) "
            "and spatially averaged over the Cachar study window [92.70, 24.75, 92.90, 24.90]. "
            "Because spatial variation across this 20 km x 16 km window is minimal, rainfall is provided as "
            "basin-wide meteorological context rather than input to a spatial regression model."
        ),
    }

    out_path = Path(event_dir) / "rainfall_imerg.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    web_path = Path("apps/web/public/data/events/assam-2022/rainfall_imerg.json")
    if web_path.parent.is_dir():
        with open(web_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

    print(f"Saved IMERG rainfall context to {out_path} and mirrored to {web_path}")
    print(f"  1-day accum: {payload['rainfall_summary']['accum_1day_mm']} mm")
    print(f"  3-day accum: {payload['rainfall_summary']['accum_3day_mm']} mm")
    print(f"  7-day accum: {payload['rainfall_summary']['accum_7day_mm']} mm")
    return payload


if __name__ == "__main__":
    extract_imerg_rainfall()
