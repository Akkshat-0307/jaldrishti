"""GET /events/{id}/whatif – rainfall what-if slider backend."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from models.schemas import WhatIfResponse

router = APIRouter(prefix="/events", tags=["what-if"])


@router.get("/{event_id}/whatif", response_model=WhatIfResponse)
async def get_whatif(
    event_id: str,
    rainfall_mm: float = Query(..., ge=0, description="Additional rainfall in mm"),
) -> WhatIfResponse:
    raise HTTPException(
        status_code=501,
        detail={"code": 501, "message": "Not implemented yet — Phase 5"},
    )
