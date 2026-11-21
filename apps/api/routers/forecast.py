"""GET /forecast/river – river-discharge outlook (Open-Meteo based)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from models.schemas import RiverForecast

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/river", response_model=RiverForecast)
async def get_river_forecast(
    lat: float = Query(..., description="Latitude of the river point"),
    lon: float = Query(..., description="Longitude of the river point"),
) -> RiverForecast:
    raise HTTPException(
        status_code=501,
        detail={"code": 501, "message": "Not implemented yet — Phase 5"},
    )
