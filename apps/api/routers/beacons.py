"""Beacon CRUD + SSE feed – rescue beacon endpoints backed by SQLite."""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from sse_starlette.sse import EventSourceResponse

from beacon_db import (
    get_beacon_by_id,
    init_db,
    list_beacons,
    save_beacon,
    update_beacon_status,
)
from beacon_payload import decode_payload_string, unpack_beacon_payload
from models.schemas import (
    BeaconCreate,
    BeaconResponse,
    BeaconStatus,
    BeaconUpdate,
)

router = APIRouter(prefix="/beacons", tags=["beacons"])

# Active SSE subscriber queues
_sse_subscribers: set[asyncio.Queue[dict[str, Any]]] = set()

# In-memory sliding window rate limiter
_write_rate_limits: dict[str, list[float]] = {}
_RATE_LIMIT_WINDOW = 60.0
_MAX_WRITES_PER_WINDOW = 60


def check_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    history = _write_rate_limits.setdefault(client_ip, [])
    # Evict older than 60s
    _write_rate_limits[client_ip] = [t for t in history if now - t < _RATE_LIMIT_WINDOW]
    if len(_write_rate_limits[client_ip]) >= _MAX_WRITES_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail={"code": 429, "message": "Rate limit exceeded: maximum 60 write requests per minute."},
            headers={"Retry-After": "60"},
        )
    _write_rate_limits[client_ip].append(now)


async def broadcast_beacon_event(event_type: str, beacon: dict[str, Any]) -> None:
    """Broadcast an event to all connected SSE clients."""
    for q in list(_sse_subscribers):
        try:
            await q.put({"event": event_type, "data": beacon})
        except Exception:
            _sse_subscribers.discard(q)


@router.post("", response_model=BeaconResponse, status_code=201)
async def create_beacon(body: BeaconCreate, request: Request) -> BeaconResponse:
    """Ingest a new rescue beacon (idempotent by payload_code)."""
    check_rate_limit(request)
    data = body.model_dump()

    # If payload_code is provided without explicit coords or needs, unpack it
    if body.payload_code:
        try:
            raw_bytes = decode_payload_string(body.payload_code)
            unpacked = unpack_beacon_payload(raw_bytes)
            data["lat"] = unpacked["lat"]
            data["lon"] = unpacked["lon"]
            data["timestamp"] = unpacked["timestamp"]
            data["need_type"] = unpacked["need_type"]
            data["group_size"] = unpacked["group_size"]
            data["raw_hex"] = raw_bytes.hex().upper()
        except Exception as e:
            # If payload_code is invalid, but body has lat/lon, proceed with body lat/lon
            if not body.lat or not body.lon:
                raise HTTPException(status_code=400, detail=f"Invalid payload code: {str(e)}")

    record = save_beacon(data)

    # Format timestamp for schema
    ts_val = record["timestamp"]
    if isinstance(ts_val, (int, float)):
        ts_obj = datetime.fromtimestamp(ts_val, tz=timezone.utc)
    else:
        ts_obj = datetime.now(tz=timezone.utc)

    response = BeaconResponse(
        id=record["id"],
        lat=record["latitude"],
        lon=record["longitude"],
        timestamp=ts_obj,
        group_size=record["group_size"],
        need_type=record["need_type"],
        battery=record["battery"],
        channel=record["channel"],
        status=record["status"],
        payload_code=record["payload_code"],
        raw_hex=record["raw_hex"],
        note=record["note"],
        assigned_team=record["assigned_team"],
        nearest_zone_id=record["nearest_zone_id"],
        zone_name=record["zone_name"],
        is_cutoff=bool(record["is_cutoff"]),
        touches_edge=bool(record["touches_edge"]),
        route_or_staging_hint=record["route_or_staging_hint"],
        provenance=record["provenance"],
        created_at=record["created_at"],
        updated_at=record["updated_at"],
    )

    await broadcast_beacon_event("beacon_created", response.model_dump(mode="json"))
    return response


@router.get("", response_model=list[BeaconResponse])
async def get_beacons(
    status: BeaconStatus | None = None,
    need_type: str | None = None,
    zone_id: str | None = None,
    cutoff_only: bool = Query(default=False),
) -> list[BeaconResponse]:
    """Retrieve beacons with optional filters and priority ordering."""
    records = list_beacons(
        status=status.value if status else None,
        need_type=need_type,
        zone_id=zone_id,
        cutoff_only=cutoff_only,
    )
    result = []
    for r in records:
        ts_val = r["timestamp"]
        if isinstance(ts_val, (int, float)):
            ts_obj = datetime.fromtimestamp(ts_val, tz=timezone.utc)
        else:
            ts_obj = datetime.now(tz=timezone.utc)

        result.append(
            BeaconResponse(
                id=r["id"],
                lat=r["latitude"],
                lon=r["longitude"],
                timestamp=ts_obj,
                group_size=r["group_size"],
                need_type=r["need_type"],
                battery=r["battery"],
                channel=r["channel"],
                status=r["status"],
                payload_code=r["payload_code"],
                raw_hex=r["raw_hex"],
                note=r["note"],
                assigned_team=r["assigned_team"],
                nearest_zone_id=r["nearest_zone_id"],
                zone_name=r["zone_name"],
                is_cutoff=bool(r["is_cutoff"]),
                touches_edge=bool(r["touches_edge"]),
                route_or_staging_hint=r["route_or_staging_hint"],
                provenance=r["provenance"],
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
        )
    return result


@router.get("/stream")
async def beacon_stream(request: Request) -> EventSourceResponse:
    """Server-Sent Events (SSE) streaming updates for responder consoles."""
    client_queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    _sse_subscribers.add(client_queue)

    last_event_id = request.headers.get("last-event-id") or request.query_params.get("last_event_id")

    async def _event_generator() -> Any:
        try:
            # Initial snapshot of existing beacons
            current_beacons = list_beacons()
            for b in current_beacons:
                ts_val = b["timestamp"]
                ts_iso = (
                    datetime.fromtimestamp(ts_val, tz=timezone.utc).isoformat()
                    if isinstance(ts_val, (int, float))
                    else str(ts_val)
                )
                payload = {**b, "timestamp": ts_iso}
                yield {
                    "event": "beacon",
                    "id": b["id"],
                    "data": json.dumps(payload),
                }

            if last_event_id:
                yield {
                    "event": "sync",
                    "id": f"sync-{int(datetime.now(tz=timezone.utc).timestamp())}",
                    "data": json.dumps({"resumed_from": last_event_id, "status": "ok"}),
                }

            # Listen for live updates or emit keep-alive pings every 15s
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(client_queue.get(), timeout=15.0)
                    yield {
                        "event": event["event"],
                        "id": event["data"].get("id", f"evt-{int(datetime.now(tz=timezone.utc).timestamp())}"),
                        "data": json.dumps(event["data"]),
                    }
                except asyncio.TimeoutError:
                    # Heartbeat comment/ping
                    yield {
                        "event": "ping",
                        "id": f"ping-{int(datetime.now(tz=timezone.utc).timestamp())}",
                        "data": json.dumps({"time": datetime.now(tz=timezone.utc).isoformat()}),
                    }
        finally:
            _sse_subscribers.discard(client_queue)

    return EventSourceResponse(_event_generator(), ping=15)


@router.get("/{beacon_id}", response_model=BeaconResponse)
async def get_beacon(beacon_id: str) -> BeaconResponse:
    """Retrieve a single beacon by ID."""
    r = get_beacon_by_id(beacon_id)
    if not r:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": f"Beacon '{beacon_id}' not found"},
        )
    ts_val = r["timestamp"]
    if isinstance(ts_val, (int, float)):
        ts_obj = datetime.fromtimestamp(ts_val, tz=timezone.utc)
    else:
        ts_obj = datetime.now(tz=timezone.utc)

    return BeaconResponse(
        id=r["id"],
        lat=r["latitude"],
        lon=r["longitude"],
        timestamp=ts_obj,
        group_size=r["group_size"],
        need_type=r["need_type"],
        battery=r["battery"],
        channel=r["channel"],
        status=r["status"],
        payload_code=r["payload_code"],
        raw_hex=r["raw_hex"],
        note=r["note"],
        assigned_team=r["assigned_team"],
        nearest_zone_id=r["nearest_zone_id"],
        zone_name=r["zone_name"],
        is_cutoff=bool(r["is_cutoff"]),
        touches_edge=bool(r["touches_edge"]),
        route_or_staging_hint=r["route_or_staging_hint"],
        provenance=r["provenance"],
        created_at=r["created_at"],
        updated_at=r["updated_at"],
    )


@router.patch("/{beacon_id}", response_model=BeaconResponse)
async def update_beacon(beacon_id: str, body: BeaconUpdate, request: Request) -> BeaconResponse:
    """Update beacon status obeying state machine, or assign team/notes."""
    check_rate_limit(request)
    updated, error = update_beacon_status(
        beacon_id=beacon_id,
        target_status=body.status.value if body.status else None,
        assigned_team=body.assigned_team,
        note=body.note,
    )
    if error:
        if "not found" in error:
            raise HTTPException(
                status_code=404,
                detail={"code": 404, "message": error},
            )
        # Invalid status transition raises 409 Conflict
        raise HTTPException(
            status_code=409,
            detail={"code": 409, "message": error},
        )

    assert updated is not None
    ts_val = updated["timestamp"]
    if isinstance(ts_val, (int, float)):
        ts_obj = datetime.fromtimestamp(ts_val, tz=timezone.utc)
    else:
        ts_obj = datetime.now(tz=timezone.utc)

    response = BeaconResponse(
        id=updated["id"],
        lat=updated["latitude"],
        lon=updated["longitude"],
        timestamp=ts_obj,
        group_size=updated["group_size"],
        need_type=updated["need_type"],
        battery=updated["battery"],
        channel=updated["channel"],
        status=updated["status"],
        payload_code=updated["payload_code"],
        raw_hex=updated["raw_hex"],
        note=updated["note"],
        assigned_team=updated["assigned_team"],
        nearest_zone_id=updated["nearest_zone_id"],
        zone_name=updated["zone_name"],
        is_cutoff=bool(updated["is_cutoff"]),
        touches_edge=bool(updated["touches_edge"]),
        route_or_staging_hint=updated["route_or_staging_hint"],
        provenance=updated["provenance"],
        created_at=updated["created_at"],
        updated_at=updated["updated_at"],
    )

    await broadcast_beacon_event("beacon_updated", response.model_dump(mode="json"))
    return response
