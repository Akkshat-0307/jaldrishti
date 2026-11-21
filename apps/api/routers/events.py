"""GET /events and GET /events/{id} – event list and detail."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from config import DEMO_MODE
from models.schemas import EventDetail, EventSummary
from static_fallback import load_fallback

router = APIRouter(prefix="/events", tags=["events"])

# ---------------------------------------------------------------------------
# Demo stub data
# ---------------------------------------------------------------------------

_DEMO_EVENTS: list[dict[str, object]] = [
    {
        "event_id": "assam2022",
        "name": "Assam Floods June 2022",
        "region": "Assam, India",
        "date_start": "2022-06-14",
        "date_end": "2022-06-30",
        "bbox": [89.5, 24.5, 96.0, 28.0],
    },
    {
        "event_id": "kerala2018",
        "name": "Kerala Floods August 2018",
        "region": "Kerala, India",
        "date_start": "2018-08-08",
        "date_end": "2018-08-30",
        "bbox": [75.5, 8.0, 77.5, 12.5],
    },
]


@router.get("", response_model=list[EventSummary])
async def list_events() -> list[EventSummary]:
    fallback = load_fallback("events/index.json")
    if fallback is not None:
        return [EventSummary(**e) for e in fallback]
    return [EventSummary(**e) for e in _DEMO_EVENTS]


@router.get("/{event_id}", response_model=EventDetail)
async def get_event(event_id: str) -> EventDetail:
    fallback = load_fallback(f"events/{event_id}/manifest.json")
    if fallback is not None:
        return EventDetail(**fallback)

    for ev in _DEMO_EVENTS:
        if ev["event_id"] == event_id:
            return EventDetail(**ev)

    raise HTTPException(status_code=404, detail={"code": 404, "message": f"Event '{event_id}' not found"})
