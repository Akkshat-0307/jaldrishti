"""POST /alerts/preview – generate multilingual alert text, SMS segment count, and CAP v1.2 XML."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from config import DATA_DIR
from models.schemas import AlertRequest, AlertResponse
from pipeline.alerts import build_alert_payload

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/preview", response_model=AlertResponse)
async def preview_alert(req: AlertRequest) -> AlertResponse:
    try:
        event_dir = DATA_DIR / "events" / "assam-2022"
        payload = build_alert_payload(
            zone_id=req.zone,
            severity=req.severity,
            language=req.language,
            event_dir=event_dir,
        )
        return AlertResponse(**payload)
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail={"code": 500, "message": f"Alert generation error: {str(err)}"},
        )
