"""SQLite database and spatial zone matching for rescue beacons."""

from __future__ import annotations

import json
import math
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from beacon_payload import (
    decode_payload_string,
    encode_payload_string,
    pack_beacon_payload,
    unpack_beacon_payload,
)

DB_PATH = os.environ.get("BEACONS_DB_PATH", str(Path(__file__).parent / "beacons.db"))
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "events" / "assam-2022"

VALID_TRANSITIONS = {
    "new": ["assigned"],
    "assigned": ["en_route", "new"],
    "en_route": ["rescued", "assigned"],
    "rescued": [],
}


def get_db_connection() -> sqlite3.Connection:
    """Get SQLite database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database tables and seed initial demo beacons if empty."""
    conn = get_db_connection()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS beacons (
                id TEXT PRIMARY KEY,
                payload_code TEXT UNIQUE NOT NULL,
                raw_hex TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                timestamp INTEGER NOT NULL,
                need_type TEXT NOT NULL,
                group_size INTEGER NOT NULL,
                battery REAL,
                channel TEXT NOT NULL DEFAULT 'online',
                note TEXT,
                status TEXT NOT NULL DEFAULT 'new',
                assigned_team TEXT,
                nearest_zone_id TEXT,
                zone_name TEXT,
                is_cutoff INTEGER NOT NULL DEFAULT 0,
                touches_edge INTEGER NOT NULL DEFAULT 0,
                route_or_staging_hint TEXT,
                provenance TEXT NOT NULL DEFAULT 'SIMULATED',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        conn.commit()

        # Check if table is empty
        cursor = conn.execute("SELECT COUNT(*) as count FROM beacons")
        row = cursor.fetchone()
        if row and row["count"] == 0:
            seed_synthetic_beacons(conn)
    finally:
        conn.close()


def find_nearest_zone(lat: float, lon: float) -> dict[str, Any]:
    """Find the nearest settlement zone in Cachar and return zone and routing info."""
    villages_path = DATA_DIR / "villages.geojson"
    routes_path = DATA_DIR / "routes.json"

    if not villages_path.exists():
        return {
            "nearest_zone_id": "zone_unknown",
            "zone_name": "Cachar District (General)",
            "is_cutoff": False,
            "touches_edge": False,
            "route_or_staging_hint": "Location recorded within Cachar study window.",
        }

    with open(villages_path, encoding="utf-8") as f:
        villages_data = json.load(f)

    routes_data = {}
    if routes_path.exists():
        with open(routes_path, encoding="utf-8") as f:
            routes_data = json.load(f)

    best_dist = float("inf")
    best_props: dict[str, Any] = {}

    for feat in villages_data.get("features", []):
        props = feat.get("properties", {})
        center = props.get("center")
        if center and len(center) == 2:
            c_lon, c_lat = center[0], center[1]
            # Euclidean distance approximation in km
            dist = math.hypot((lat - c_lat) * 111.0, (lon - c_lon) * 100.0)
            if dist < best_dist:
                best_dist = dist
                best_props = props

    zone_id = best_props.get("zone_id", "zone_unknown")
    zone_name = best_props.get("name", "Unknown Zone")
    is_cutoff = bool(best_props.get("isolated", False))
    touches_edge = bool(best_props.get("touches_window_edge", False))

    # Route / staging hint
    z_route = routes_data.get(zone_id, {})
    if is_cutoff:
        staging = z_route.get("staging_hint", {})
        mode = staging.get("recommended_mode", "Boat or Air Staging")
        dist_km = staging.get("straight_line_distance_km", round(best_dist, 2))
        hint = f"{mode} suggested ({dist_km} km to passable highway network)."
    else:
        shelter = z_route.get("destination_shelter", {}).get("name", "Nearest Shelter")
        d_km = z_route.get("distance_km", round(best_dist, 2))
        eta = z_route.get("eta_minutes", 10.0)
        hint = f"Dry route viable to {shelter} ({d_km} km, {eta} min ETA)."

    return {
        "nearest_zone_id": zone_id,
        "zone_name": zone_name,
        "is_cutoff": is_cutoff,
        "touches_edge": touches_edge,
        "route_or_staging_hint": hint,
    }


def seed_synthetic_beacons(conn: sqlite3.Connection) -> None:
    """Seed 5 realistic synthetic rescue beacons around Cachar."""
    seeds = [
        {
            "id": "bcn_debpara_01",
            "lat": 24.861674,
            "lon": 92.842047,
            "need_type": "medical",
            "group_size": 6,
            "battery": 45.0,
            "channel": "online",
            "note": "2 elderly residents require insulin & urgent dialysis evacuation.",
            "status": "new",
            "assigned_team": None,
        },
        {
            "id": "bcn_masimpur_02",
            "lat": 24.872410,
            "lon": 92.812350,
            "need_type": "boat",
            "group_size": 4,
            "battery": 78.0,
            "channel": "nav_sim",
            "note": "Rooftop marooned; ground floor submerged 2.5 meters. Need boat evac.",
            "status": "assigned",
            "assigned_team": "Team Alpha - NDRF Boat 1",
        },
        {
            "id": "bcn_ratpur_03",
            "lat": 24.845012,
            "lon": 92.715340,
            "need_type": "food",
            "group_size": 8,
            "battery": 22.0,
            "channel": "sms",
            "note": "Drinking water exhausted for 48 hours; infant rations required.",
            "status": "new",
            "assigned_team": None,
        },
        {
            "id": "bcn_ramnagar_04",
            "lat": 24.819020,
            "lon": 92.785410,
            "need_type": "medical",
            "group_size": 2,
            "battery": 65.0,
            "channel": "online",
            "note": "Fractured limb from collapsed wall; dry access road passable.",
            "status": "en_route",
            "assigned_team": "Team Bravo - SDRF Ambulatory",
        },
        {
            "id": "bcn_dudhpatli_05",
            "lat": 24.881230,
            "lon": 92.834190,
            "need_type": "boat",
            "group_size": 5,
            "battery": 88.0,
            "channel": "nav_sim",
            "note": "Severed interior zone; stranded at school compound high point.",
            "status": "new",
            "assigned_team": None,
        },
    ]

    now_iso = datetime.now(tz=timezone.utc).isoformat()
    now_ts = int(datetime.now(tz=timezone.utc).timestamp()) & 0xFFFFFFFF

    for s in seeds:
        raw_bytes = pack_beacon_payload(
            lat=s["lat"],
            lon=s["lon"],
            timestamp=now_ts,
            need_type=s["need_type"],
            group_size=s["group_size"],
        )
        payload_code = encode_payload_string(raw_bytes, "base32")
        raw_hex = raw_bytes.hex().upper()

        zone_info = find_nearest_zone(s["lat"], s["lon"])

        conn.execute(
            """
            INSERT OR IGNORE INTO beacons (
                id, payload_code, raw_hex, latitude, longitude, timestamp,
                need_type, group_size, battery, channel, note, status,
                assigned_team, nearest_zone_id, zone_name, is_cutoff,
                touches_edge, route_or_staging_hint, provenance, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                s["id"],
                payload_code,
                raw_hex,
                s["lat"],
                s["lon"],
                now_ts,
                s["need_type"],
                s["group_size"],
                s["battery"],
                s["channel"],
                s["note"],
                s["status"],
                s["assigned_team"],
                zone_info["nearest_zone_id"],
                zone_info["zone_name"],
                1 if zone_info["is_cutoff"] else 0,
                1 if zone_info["touches_edge"] else 0,
                zone_info["route_or_staging_hint"],
                "SIMULATED",
                now_iso,
                now_iso,
            ),
        )
    conn.commit()


def save_beacon(data: dict[str, Any]) -> dict[str, Any]:
    """Ingest or return an existing beacon idempotently by payload_code."""
    init_db()
    conn = get_db_connection()
    try:
        payload_code = data.get("payload_code")
        raw_hex = data.get("raw_hex")
        lat = float(data["lat"])
        lon = float(data["lon"])
        group_size = int(data.get("group_size", 1))

        need_val = data.get("need_type", "other")
        need_type = need_val.value if hasattr(need_val, "value") else str(need_val)
        if "." in need_type:
            need_type = need_type.split(".")[-1]

        battery = float(data["battery"]) if data.get("battery") is not None else None

        chan_val = data.get("channel", "online")
        channel = chan_val.value if hasattr(chan_val, "value") else str(chan_val)
        if "." in channel:
            channel = channel.split(".")[-1]

        note = data.get("note", "")

        ts = int(data.get("timestamp", int(datetime.now(tz=timezone.utc).timestamp())))

        # If payload_code or raw_hex was not provided, construct it
        if not payload_code or not raw_hex:
            raw_bytes = pack_beacon_payload(lat, lon, ts, need_type, group_size)
            payload_code = encode_payload_string(raw_bytes, "base32")
            raw_hex = raw_bytes.hex().upper()

        # Check for existing beacon by payload_code (idempotent duplicate prevention)
        cursor = conn.execute("SELECT * FROM beacons WHERE payload_code = ?", (payload_code,))
        existing = cursor.fetchone()
        if existing:
            return dict(existing)

        # Match nearest zone
        zone_info = find_nearest_zone(lat, lon)
        beacon_id = f"bcn_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.now(tz=timezone.utc).isoformat()

        conn.execute(
            """
            INSERT INTO beacons (
                id, payload_code, raw_hex, latitude, longitude, timestamp,
                need_type, group_size, battery, channel, note, status,
                assigned_team, nearest_zone_id, zone_name, is_cutoff,
                touches_edge, route_or_staging_hint, provenance, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                beacon_id,
                payload_code,
                raw_hex,
                lat,
                lon,
                ts,
                need_type,
                group_size,
                battery,
                channel,
                note,
                "new",
                None,
                zone_info["nearest_zone_id"],
                zone_info["zone_name"],
                1 if zone_info["is_cutoff"] else 0,
                1 if zone_info["touches_edge"] else 0,
                zone_info["route_or_staging_hint"],
                "SIMULATED",
                now_iso,
                now_iso,
            ),
        )
        conn.commit()

        cursor = conn.execute("SELECT * FROM beacons WHERE id = ?", (beacon_id,))
        created = cursor.fetchone()
        return dict(created)
    finally:
        conn.close()


def list_beacons(
    status: str | None = None,
    need_type: str | None = None,
    zone_id: str | None = None,
    cutoff_only: bool = False,
) -> list[dict[str, Any]]:
    """Query beacons with optional filters and priority ordering."""
    init_db()
    conn = get_db_connection()
    try:
        query = "SELECT * FROM beacons WHERE 1=1"
        params: list[Any] = []

        if status:
            query += " AND status = ?"
            params.append(status)
        if need_type:
            query += " AND need_type = ?"
            params.append(need_type)
        if zone_id:
            query += " AND nearest_zone_id = ?"
            params.append(zone_id)
        if cutoff_only:
            query += " AND is_cutoff = 1"

        # Ordering priority:
        # 1. Status 'new' first, then 'assigned', 'en_route', 'rescued'
        # 2. Cut-off zones before connected
        # 3. Medical need > Boat > Food > Other
        # 4. Group size descending
        query += """
            ORDER BY
                CASE status
                    WHEN 'new' THEN 1
                    WHEN 'assigned' THEN 2
                    WHEN 'en_route' THEN 3
                    WHEN 'rescued' THEN 4
                    ELSE 5
                END ASC,
                is_cutoff DESC,
                CASE need_type
                    WHEN 'medical' THEN 1
                    WHEN 'boat' THEN 2
                    WHEN 'food' THEN 3
                    ELSE 4
                END ASC,
                group_size DESC,
                created_at DESC
        """
        cursor = conn.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_beacon_by_id(beacon_id: str) -> dict[str, Any] | None:
    """Retrieve single beacon by ID."""
    init_db()
    conn = get_db_connection()
    try:
        cursor = conn.execute("SELECT * FROM beacons WHERE id = ?", (beacon_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def update_beacon_status(
    beacon_id: str,
    target_status: str | None = None,
    assigned_team: str | None = None,
    note: str | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Transition beacon status obeying state machine.
    Returns (updated_record, error_message).
    """
    init_db()
    conn = get_db_connection()
    try:
        cursor = conn.execute("SELECT * FROM beacons WHERE id = ?", (beacon_id,))
        row = cursor.fetchone()
        if not row:
            return None, f"Beacon '{beacon_id}' not found"

        current = dict(row)
        current_status = current["status"]

        if target_status and target_status != current_status:
            allowed = VALID_TRANSITIONS.get(current_status, [])
            if target_status not in allowed:
                return None, f"Invalid transition from '{current_status}' to '{target_status}'"

        new_status = target_status if target_status else current_status
        new_team = assigned_team if assigned_team is not None else current["assigned_team"]
        new_note = note if note is not None else current["note"]
        now_iso = datetime.now(tz=timezone.utc).isoformat()

        conn.execute(
            """
            UPDATE beacons
            SET status = ?, assigned_team = ?, note = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_status, new_team, new_note, now_iso, beacon_id),
        )
        conn.commit()

        cursor = conn.execute("SELECT * FROM beacons WHERE id = ?", (beacon_id,))
        updated = cursor.fetchone()
        return dict(updated) if updated else None, None
    finally:
        conn.close()
