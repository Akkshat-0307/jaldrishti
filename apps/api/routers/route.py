"""GET /events/{id}/route – evacuation routing."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from models.schemas import RouteResponse

router = APIRouter(prefix="/events", tags=["routing"])


@router.get("/{event_id}/route", response_model=RouteResponse)
async def get_route(
    event_id: str,
    lat: float = Query(..., description="Origin latitude"),
    lon: float = Query(..., description="Origin longitude"),
    shelter_id: str | None = Query(None, description="Destination shelter ID, or auto-nearest"),
) -> RouteResponse:
    raise HTTPException(
        status_code=501,
        detail={"code": 501, "message": "Not implemented yet — Phase 4"},
    )
