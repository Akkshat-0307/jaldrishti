"""River Outlook provider using Open-Meteo Flood API (ECMWF GloFAS v4.0).

Location: Barak River, Cachar / Silchar, Assam (24.825° N, 92.80° E).
Data Source: European Centre for Medium-Range Weather Forecasts (ECMWF) Global Flood Awareness System (GloFAS).
Layer Provenance: REAL (modelled, GloFAS-derived).

Output: data/events/assam-2022/river_outlook_cached.json
Mirrored to: apps/web/public/data/events/assam-2022/river_outlook_cached.json
"""

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

CACHAR_RIVER_LAT = 24.825
CACHAR_RIVER_LON = 92.800
OPEN_METEO_FLOOD_URL = (
    "https://flood-api.open-meteo.com/v1/flood"
    f"?latitude={CACHAR_RIVER_LAT}&longitude={CACHAR_RIVER_LON}"
    "&daily=river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min"
    "&forecast_days=7"
)


def fetch_river_outlook(
    lat: float = CACHAR_RIVER_LAT,
    lon: float = CACHAR_RIVER_LON,
    event_dir: Path | str = "data/events/assam-2022",
    force_live: bool = False,
) -> Dict[str, Any]:
    """Fetch live GloFAS river outlook from Open-Meteo or fallback to cached snapshot."""
    cached_path = Path(event_dir) / "river_outlook_cached.json"

    demo_mode = os.getenv("DEMO_MODE", "0") == "1"

    if demo_mode and not force_live and cached_path.is_file():
        with open(cached_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            data["source_mode"] = "cached (DEMO_MODE=1)"
            return data

    # Attempt live query
    try:
        url = (
            f"https://flood-api.open-meteo.com/v1/flood"
            f"?latitude={lat}&longitude={lon}"
            f"&daily=river_discharge,river_discharge_mean,river_discharge_max,river_discharge_min"
            f"&forecast_days=7"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "JalDrishti/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = json.loads(resp.read().decode("utf-8"))

        daily = raw.get("daily", {})
        dates = daily.get("time", [])
        discharges = daily.get("river_discharge", [])
        means = daily.get("river_discharge_mean", [])
        maxs = daily.get("river_discharge_max", [])
        mins = daily.get("river_discharge_min", [])

        # Evaluate trend
        trend = "stable"
        if len(discharges) >= 3:
            diff = discharges[2] - discharges[0]
            if diff > 15:
                trend = "rising"
            elif diff < -15:
                trend = "falling"

        peak_discharge = max(maxs) if maxs else (max(discharges) if discharges else 0.0)
        current_discharge = discharges[0] if discharges else 0.0

        forecast_points = []
        for i in range(len(dates)):
            forecast_points.append({
                "date": dates[i],
                "discharge_m3s": round(float(discharges[i]), 1) if i < len(discharges) and discharges[i] is not None else None,
                "mean_m3s": round(float(means[i]), 1) if i < len(means) and means[i] is not None else None,
                "max_m3s": round(float(maxs[i]), 1) if i < len(maxs) and maxs[i] is not None else None,
                "min_m3s": round(float(mins[i]), 1) if i < len(mins) and mins[i] is not None else None,
            })

        payload = {
            "river_name": "Barak River",
            "station_location": "Silchar / Cachar, Assam",
            "cell_label": "nearest GloFAS river cell",
            "temporal_scope": "current outlook (not the 2022 event)",
            "coordinates": [round(lon, 4), round(lat, 4)],
            "elevation_m": raw.get("elevation", 27.0),
            "model_source": "ECMWF GloFAS v4.0 via Open-Meteo Flood API",
            "layer_provenance": "REAL (modelled, GloFAS-derived)",
            "fetch_timestamp": datetime.now(timezone.utc).isoformat(),
            "source_mode": "live",
            "units": {
                "river_discharge": "m³/s",
            },
            "current_discharge_m3s": round(float(current_discharge), 1),
            "peak_forecast_discharge_m3s": round(float(peak_discharge), 1),
            "trend": trend,
            "daily_forecast": forecast_points,
            "disclaimer": (
                "GloFAS river discharge values are global hydrological model outputs forced by numerical weather "
                "predictions for the nearest GloFAS river cell (current outlook, not the 2022 event). "
                "Useful for regional trend and timing outlook, but not equivalent to in-situ gauge measurements."
            ),
        }

        # Cache snapshot
        with open(cached_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)

        web_path = Path("apps/web/public/data/events/assam-2022/river_outlook_cached.json")
        if web_path.parent.is_dir():
            with open(web_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)

        return payload

    except Exception as e:
        print(f"Warning: Open-Meteo request failed ({e}). Falling back to cached snapshot.")
        if cached_path.is_file():
            with open(cached_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                data["source_mode"] = "cached fallback"
                return data
        raise RuntimeError(f"Failed to fetch GloFAS river outlook and no cache exists: {e}") from e


def cache_river_outlook(
    event_dir: Path | str = "data/events/assam-2022",
) -> Dict[str, Any]:
    """Explicitly cache river outlook to disk and mirror to web public directory."""
    return fetch_river_outlook(event_dir=event_dir, force_live=True)


if __name__ == "__main__":
    res = cache_river_outlook()
    print("Cached River Outlook:")
    print(f"  River: {res['river_name']} at {res['station_location']}")
    print(f"  Current Discharge: {res['current_discharge_m3s']} m³/s, Peak: {res['peak_forecast_discharge_m3s']} m³/s")
    print(f"  Trend: {res['trend']}, Temporal Scope: {res['temporal_scope']}")
