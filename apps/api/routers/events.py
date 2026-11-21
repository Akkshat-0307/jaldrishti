"""GET /events and GET /events/{id} – event list and detail."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException

from models.schemas import EventDetail, EventSummary
from static_fallback import load_fallback

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventSummary])
async def list_events() -> list[EventSummary]:
    fallback = load_fallback("events/index.json")
    if fallback is not None:
        return [EventSummary(**e) for e in fallback]

    return [
        EventSummary(
            event_id="assam-2022",
            name="Assam Flood — June 2022 (Silchar & Barak Basin Peak)",
            region="Cachar & Barak Valley, Assam, India",
            date_start="2022-05-01",
            date_end="2022-06-30",
            bbox=[92.70, 24.75, 92.90, 24.90],
        )
    ]


@router.get("/{event_id}", response_model=EventDetail)
async def get_event(event_id: str) -> EventDetail:
    # Normalize event ID format (handle assam-2022 and assam2022)
    normalized_id = event_id.replace("assam2022", "assam-2022")

    manifest = load_fallback(f"events/{normalized_id}/manifest.json")
    if manifest is not None:
        metrics = load_fallback(f"events/{normalized_id}/metrics.json")
        scenes = [
            s.get("scene_id")
            for s in manifest.get("datasets", {}).get("sentinel1", {}).get("scenes", [])
            if "scene_id" in s
        ]

        return EventDetail(
            event_id=manifest.get("event_id", normalized_id),
            name=manifest.get("name", "Assam Flood 2022"),
            region=f"{manifest.get('primary_area', 'Cachar')}, {manifest.get('state', 'Assam')}, {manifest.get('country', 'India')}",
            date_start=manifest.get("baseline_date", "2022-05-01"),
            date_end=manifest.get("flood_recession_date", "2022-06-30"),
            bbox=manifest.get("bbox", [92.70, 24.75, 92.90, 24.90]),
            sentinel1_scenes=scenes,
            baseline_date=manifest.get("baseline_date"),
            flood_dates=[
                manifest.get("flood_peak_date", "2022-06-18"),
                manifest.get("flood_recession_date", "2022-06-30"),
            ],
            metrics=metrics,
            tile_urls={
                "flood_mask_tif": f"/static/events/{normalized_id}/flood_mask.tif",
                "flood_polygons_geojson": f"/static/events/{normalized_id}/flood_polygons.geojson",
            },
        )

    raise HTTPException(
        status_code=404,
        detail={"code": 404, "message": f"Event '{event_id}' not found"},
    )
