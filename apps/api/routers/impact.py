"""GET /events/{id}/impact – ranked villages with priority scores."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from models.schemas import ImpactResponse

router = APIRouter(prefix="/events", tags=["impact"])


@router.get("/{event_id}/impact", response_model=ImpactResponse)
async def get_impact(
    event_id: str,
    weight_population: float = Query(0.3, ge=0, le=1),
    weight_flooded_fraction: float = Query(0.25, ge=0, le=1),
    weight_isolation: float = Query(0.3, ge=0, le=1),
    weight_facilities: float = Query(0.15, ge=0, le=1),
) -> ImpactResponse:
    raise HTTPException(
        status_code=501,
        detail={"code": 501, "message": "Not implemented yet — Phase 3"},
    )
