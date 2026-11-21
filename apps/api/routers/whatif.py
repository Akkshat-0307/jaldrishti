"""GET /events/{id}/whatif – HAND water-level what-if scenario endpoint."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from config import DATA_DIR
from models.schemas import WhatIfResponse

SCENARIO_DELTAS = [-1.0, -0.5, 0.0, 0.5, 1.0, 2.0]
DELTA_TAGS = {
    -1.0: "m10",
    -0.5: "m05",
    0.0: "p00",
    0.5: "p05",
    1.0: "p10",
    2.0: "p20",
}

router = APIRouter(prefix="/events", tags=["what-if"])


@router.get("/{event_id}/whatif", response_model=WhatIfResponse)
async def get_whatif(
    event_id: str,
    delta_m: Optional[float] = Query(0.0, description="Water-level anomaly in meters relative to calibrated baseline h* (-1.0 to +2.0)"),
    rainfall_mm: Optional[float] = Query(None, description="Optional rainfall in mm (maps to nearest water-level scenario for compatibility)"),
) -> WhatIfResponse:
    event_dir = DATA_DIR / "events" / event_id
    if not event_dir.is_dir():
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": f"Event '{event_id}' not found."},
        )

    scenarios_dir = event_dir / "scenarios"
    index_path = scenarios_dir / "index.json"
    if not index_path.is_file():
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": f"What-if scenarios for event '{event_id}' not found."},
        )

    # If rainfall_mm was passed instead of delta_m, map rainfall to delta
    # E.g. 0mm -> 0.0m, +25mm -> +0.5m, +50mm -> +1.0m, +100mm -> +2.0m, or use delta_m directly
    target_delta = delta_m if delta_m is not None else 0.0
    if rainfall_mm is not None and delta_m == 0.0:
        if rainfall_mm <= 0:
            target_delta = -1.0
        elif rainfall_mm < 20:
            target_delta = 0.0
        elif rainfall_mm < 40:
            target_delta = 0.5
        elif rainfall_mm < 80:
            target_delta = 1.0
        else:
            target_delta = 2.0

    # Snap to closest precomputed scenario delta
    closest_delta = min(SCENARIO_DELTAS, key=lambda d: abs(d - target_delta))
    tag = DELTA_TAGS[closest_delta]

    scenario_file = scenarios_dir / f"scenario_{tag}.json"
    if not scenario_file.is_file():
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": f"Scenario file '{scenario_file.name}' not found."},
        )

    with open(scenario_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    return WhatIfResponse(
        event_id=event_id,
        delta_m=target_delta,
        snapped_delta_m=closest_delta,
        effective_water_level_m=data.get("effective_water_level_m", 3.25),
        h_star_baseline_m=data.get("h_star_baseline_m", 3.25),
        layer_provenance=data.get("layer_provenance", "DERIVED (HAND Water-Level Scenario)"),
        geojson_file=data.get("geojson_file", f"/data/events/{event_id}/scenarios/scenario_{tag}.geojson"),
        metrics=data.get("metrics", {}),
        comparison_with_observed_unet=data.get("comparison_with_observed_unet", {}),
        zones=data.get("zones", []),
        available_deltas=SCENARIO_DELTAS,
        rainfall_mm=rainfall_mm,
        risk_tile_url="",
        stats=data.get("metrics", {}),
    )
