"""POST /alerts/preview – generate multilingual alert text + CAP XML."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from models.schemas import AlertRequest, AlertResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/preview", response_model=AlertResponse)
async def preview_alert(req: AlertRequest) -> AlertResponse:
    raise HTTPException(
        status_code=501,
        detail={"code": 501, "message": "Not implemented yet — Phase 4"},
    )
