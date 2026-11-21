"""Beacon CRUD + SSE feed – rescue beacon endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from models.schemas import (
    BeaconCreate,
    BeaconResponse,
    BeaconStatus,
    BeaconUpdate,
)

router = APIRouter(prefix="/beacons", tags=["beacons"])

# In-memory store (Phase 0 stub – will move to SQLite in Phase 8)
_beacons: dict[str, BeaconResponse] = {}


def _encode_payload(b: BeaconCreate) -> str:
    """Generate a compact hex payload code (placeholder encoder)."""
    import struct

    lat_i = int(b.lat * 1_000_000)
    lon_i = int(b.lon * 1_000_000)
    ts = int(datetime.now(tz=timezone.utc).timestamp()) & 0xFFFFFFFF
    flags = b.need_type.value[0].encode()[0]  # first char ascii
    raw = struct.pack(">iiIBB", lat_i, lon_i, ts, flags, min(b.group_size, 255))
    return raw.hex()


@router.post("", response_model=BeaconResponse, status_code=201)
async def create_beacon(body: BeaconCreate) -> BeaconResponse:
    beacon_id = uuid.uuid4().hex[:12]
    beacon = BeaconResponse(
        id=beacon_id,
        lat=body.lat,
        lon=body.lon,
        timestamp=datetime.now(tz=timezone.utc),
        group_size=body.group_size,
        need_type=body.need_type,
        battery=body.battery,
        channel=body.channel,
        status=BeaconStatus.new,
        payload_code=_encode_payload(body),
    )
    _beacons[beacon_id] = beacon
    return beacon


@router.patch("/{beacon_id}", response_model=BeaconResponse)
async def update_beacon(beacon_id: str, body: BeaconUpdate) -> BeaconResponse:
    if beacon_id not in _beacons:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": f"Beacon '{beacon_id}' not found"},
        )
    existing = _beacons[beacon_id]
    update_data = body.model_dump(exclude_unset=True)
    updated = existing.model_copy(update=update_data)
    _beacons[beacon_id] = updated
    return updated


@router.get("/stream")
async def beacon_stream() -> EventSourceResponse:
    """Server-Sent Events feed of beacon updates (stub)."""

    import asyncio
    import json

    async def _event_generator() -> None:  # type: ignore[misc]
        """Yield current beacons then keep-alive pings."""
        for b in _beacons.values():
            yield {
                "event": "beacon",
                "data": json.dumps(b.model_dump(mode="json")),
            }
        while True:
            await asyncio.sleep(15)
            yield {"event": "ping", "data": ""}

    return EventSourceResponse(_event_generator())
