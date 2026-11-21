"""Pydantic models for all JalDrishti API request/response types.

Every field is explicitly typed.  Models are referenced from the routers and
are automatically rendered in the OpenAPI spec at ``/docs``.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    demo_mode: bool
    data_version: str


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class EventSummary(BaseModel):
    event_id: str
    name: str
    region: str
    date_start: str
    date_end: str
    bbox: list[float] = Field(description="[west, south, east, north]")


class EventDetail(BaseModel):
    event_id: str
    name: str
    region: str
    date_start: str
    date_end: str
    bbox: list[float] = Field(description="[west, south, east, north]")
    sentinel1_scenes: list[str] = Field(default_factory=list)
    baseline_date: str | None = None
    flood_dates: list[str] = Field(default_factory=list)
    metrics: dict[str, Any] | None = None
    tile_urls: dict[str, str] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Village / Impact
# ---------------------------------------------------------------------------

class PriorityBreakdown(BaseModel):
    population_score: float = 0.0
    flooded_fraction_score: float = 0.0
    isolation_score: float = 0.0
    facilities_score: float = 0.0


class VillageFeature(BaseModel):
    """All fields specified in Blueprint Section 6."""
    village_id: str
    name: str
    block: str
    population: int = 0
    flooded_fraction: float = 0.0
    flooded_area_ha: float = 0.0
    cropland_flooded_ha: float = 0.0
    built_up_flooded_ha: float = 0.0
    roads_cut_km: float = 0.0
    isolated: bool = False
    isolated_population: int = 0
    facilities_flooded: int = 0
    priority_score: float = 0.0
    priority_breakdown: PriorityBreakdown = Field(default_factory=PriorityBreakdown)
    nearest_safe_shelter_id: str | None = None


class ImpactResponse(BaseModel):
    event_id: str
    villages: list[VillageFeature] = Field(default_factory=list)
    total_flooded_area_km2: float = 0.0
    total_population_exposed: int = 0
    total_isolated_villages: int = 0


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------

class RouteResponse(BaseModel):
    polyline: list[list[float]] = Field(
        default_factory=list,
        description="List of [lon, lat] pairs",
    )
    distance_km: float = 0.0
    eta_minutes: float = 0.0
    alternate: list[list[float]] = Field(
        default_factory=list,
        description="Alternate route polyline",
    )


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class AlertRequest(BaseModel):
    zone: str
    severity: str = Field(description="minor | moderate | severe | extreme")
    language: str = Field(default="en", description="en | hi | as | bn")
    nearest_shelter: str | None = None
    action: str | None = None


class AlertResponse(BaseModel):
    text: str
    char_count: int
    sms_segments: int
    cap_xml: str


# ---------------------------------------------------------------------------
# Beacons
# ---------------------------------------------------------------------------

class NeedType(str, Enum):
    medical = "medical"
    food = "food"
    boat = "boat"
    other = "other"


class BeaconStatus(str, Enum):
    new = "new"
    assigned = "assigned"
    en_route = "en_route"
    rescued = "rescued"


class BeaconChannel(str, Enum):
    online = "online"
    sms = "sms"
    nav_sim = "nav_sim"


class BeaconCreate(BaseModel):
    lat: float
    lon: float
    group_size: int = 1
    need_type: NeedType = NeedType.other
    battery: float | None = Field(default=None, ge=0.0, le=100.0)
    channel: BeaconChannel = BeaconChannel.online


class BeaconUpdate(BaseModel):
    status: BeaconStatus | None = None
    group_size: int | None = None
    need_type: NeedType | None = None


class BeaconResponse(BaseModel):
    """All fields specified in Blueprint Section 6."""
    id: str
    lat: float
    lon: float
    timestamp: datetime
    group_size: int
    need_type: NeedType
    battery: float | None = None
    channel: BeaconChannel
    status: BeaconStatus
    payload_code: str


# ---------------------------------------------------------------------------
# River Forecast
# ---------------------------------------------------------------------------

class RiverForecast(BaseModel):
    lat: float
    lon: float
    river_name: str | None = None
    discharge_m3s: list[float] = Field(default_factory=list, description="Daily discharge forecast in m³/s")
    dates: list[str] = Field(default_factory=list, description="ISO date strings matching discharge values")
    return_period_years: float | None = None
    source: str = "open-meteo"


# ---------------------------------------------------------------------------
# What-If
# ---------------------------------------------------------------------------

class WhatIfResponse(BaseModel):
    event_id: str
    rainfall_mm: float
    risk_tile_url: str = ""
    stats: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Generic error body
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    code: int
    message: str
