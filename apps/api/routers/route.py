"""GET /events/{id}/route – multi-target evacuation routing and offline fallback."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query

from config import DATA_DIR
from models.schemas import RouteResponse

router = APIRouter(prefix="/events", tags=["routing"])

# Lazy-loaded RoutingEngine instance
_ENGINE_CACHE: Dict[str, Any] = {}


def get_routing_engine(event_id: str):
    global _ENGINE_CACHE
    if event_id not in _ENGINE_CACHE:
        from pipeline.routing import RoutingEngine
        event_dir = DATA_DIR / "events" / event_id
        if not event_dir.is_dir():
            raise HTTPException(
                status_code=404,
                detail={"code": 404, "message": f"Event '{event_id}' not found"},
            )
        _ENGINE_CACHE[event_id] = RoutingEngine(event_dir)
    return _ENGINE_CACHE[event_id]


@router.get("/{event_id}/route", response_model=RouteResponse)
async def get_route(
    event_id: str,
    from_param: str = Query(..., alias="from", description="Origin as 'lat,lon' or 'zone_id' (e.g. 'zone_20')"),
    to: str = Query("auto", description="Destination shelter ID, or 'auto' for nearest safe shelter"),
) -> RouteResponse:
    event_dir = DATA_DIR / "events" / event_id
    if not event_dir.is_dir():
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": f"Event '{event_id}' not found"},
        )

    # 1. Check if from_param matches a precomputed zone (e.g. 'zone_20' or 'Debpāra')
    routes_json_path = event_dir / "routes.json"
    if routes_json_path.is_file():
        try:
            with open(routes_json_path, "r", encoding="utf-8") as f:
                precomputed = json.load(f)

            # Check direct zone_id match
            if from_param in precomputed and (to == "auto" or to is None):
                res = precomputed[from_param]
                return RouteResponse(**res)

            # Check case-insensitive match on zone_id or name
            for zid, r in precomputed.items():
                if zid.lower() == from_param.lower() or r.get("origin", {}).get("label", "").lower() == from_param.lower():
                    if to == "auto" or to is None:
                        return RouteResponse(**r)
        except Exception:
            pass

    # 2. Parse coordinates if from_param is "lat,lon" or "lon,lat"
    lat: Optional[float] = None
    lon: Optional[float] = None

    if "," in from_param:
        parts = from_param.split(",")
        try:
            p1 = float(parts[0].strip())
            p2 = float(parts[1].strip())
            # In Cachar, lon is ~92.8, lat is ~24.8
            if p1 > 50.0 and p2 < 50.0:
                lon, lat = p1, p2
            else:
                lat, lon = p1, p2
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={"code": 400, "message": f"Invalid coordinate format '{from_param}'. Expected 'lat,lon'"},
            )

    if lat is None or lon is None:
        # If still None, search zone centroids
        villages_path = event_dir / "villages.geojson"
        if villages_path.is_file():
            with open(villages_path, "r", encoding="utf-8") as f:
                v_data = json.load(f)
            for feat in v_data.get("features", []):
                p = feat["properties"]
                if p["zone_id"] == from_param or p["name"].lower() == from_param.lower():
                    coords = feat["geometry"]["coordinates"]
                    if feat["geometry"]["type"] == "Polygon":
                        # Centroid average
                        lons = [pt[0] for pt in coords[0]]
                        lats = [pt[1] for pt in coords[0]]
                        lon = sum(lons) / len(lons)
                        lat = sum(lats) / len(lats)
                        break

    if lat is None or lon is None:
        raise HTTPException(
            status_code=400,
            detail={"code": 400, "message": f"Could not resolve origin '{from_param}' to coordinates or known zone"},
        )

    # 3. Dynamic Calculation via RoutingEngine (with fallback to precomputed routes)
    try:
        engine = get_routing_engine(event_id)
        route_data = engine.find_route(
            from_lon=lon,
            from_lat=lat,
            target_shelter_id=to if to != "auto" else None,
            origin_label=from_param,
        )
        return RouteResponse(**route_data)
    except Exception as err:
        # Fallback to nearest precomputed zone from routes.json
        if routes_json_path.is_file():
            try:
                with open(routes_json_path, "r", encoding="utf-8") as f:
                    precomputed = json.load(f)
                best_zid = None
                best_dist = float("inf")
                for zid, r in precomputed.items():
                    orig = r.get("origin", {})
                    o_lat = orig.get("lat")
                    o_lon = orig.get("lon")
                    if o_lat is not None and o_lon is not None:
                        d = math.hypot((lat - o_lat) * 111.0, (lon - o_lon) * 100.0)
                        if d < best_dist:
                            best_dist = d
                            best_zid = zid
                if best_zid and best_zid in precomputed:
                    fallback_res = dict(precomputed[best_zid])
                    fallback_res["origin"] = {
                        "label": f"{from_param} (snapped to {precomputed[best_zid].get('origin', {}).get('label', best_zid)})",
                        "lat": lat,
                        "lon": lon,
                        "zone_id": best_zid,
                    }
                    return RouteResponse(**fallback_res)
            except Exception:
                pass
        raise HTTPException(
            status_code=500,
            detail={"code": 500, "message": f"Routing calculation error: {str(err)}"},
        )
