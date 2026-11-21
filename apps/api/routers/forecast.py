"""GET /forecast/river – river-discharge outlook (ECMWF GloFAS via Open-Meteo)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from config import DATA_DIR
from models.schemas import RiverForecast
from pipeline.river_outlook import CACHAR_RIVER_LAT, CACHAR_RIVER_LON, fetch_river_outlook

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/river", response_model=RiverForecast)
async def get_river_forecast(
    lat: float = Query(default=CACHAR_RIVER_LAT, description="Latitude of the river point (default: Cachar / Silchar)"),
    lon: float = Query(default=CACHAR_RIVER_LON, description="Longitude of the river point (default: Cachar / Silchar)"),
) -> RiverForecast:
    event_dir = DATA_DIR / "events" / "assam-2022"
    outlook = fetch_river_outlook(lat=lat, lon=lon, event_dir=event_dir)

    dates = [p["date"] for p in outlook.get("daily_forecast", [])]
    discharges = [p["discharge_m3s"] for p in outlook.get("daily_forecast", []) if p["discharge_m3s"] is not None]

    return RiverForecast(
        lat=lat,
        lon=lon,
        river_name=outlook.get("river_name", "Barak River"),
        station_location=outlook.get("station_location", "Silchar / Cachar, Assam"),
        coordinates=outlook.get("coordinates", [lon, lat]),
        elevation_m=outlook.get("elevation_m", 27.0),
        model_source=outlook.get("model_source", "ECMWF GloFAS v4.0 via Open-Meteo Flood API"),
        layer_provenance=outlook.get("layer_provenance", "REAL (modelled, GloFAS-derived)"),
        fetch_timestamp=outlook.get("fetch_timestamp"),
        source_mode=outlook.get("source_mode", "live"),
        current_discharge_m3s=outlook.get("current_discharge_m3s", 0.0),
        peak_forecast_discharge_m3s=outlook.get("peak_forecast_discharge_m3s", 0.0),
        trend=outlook.get("trend", "stable"),
        flood_severity=outlook.get("flood_severity", "moderate"),
        discharge_m3s=discharges,
        dates=dates,
        daily_forecast=outlook.get("daily_forecast", []),
        disclaimer=outlook.get("disclaimer"),
        source=outlook.get("model_source", "open-meteo"),
    )
