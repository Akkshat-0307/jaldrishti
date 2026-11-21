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
    population_exposed_term: float | None = None
    flooded_fraction_term: float | None = None
    isolation_term: float | None = None
    critical_facilities_term: float | None = None


class VillageFeature(BaseModel):
    """All fields specified in Blueprint Section 6."""
    village_id: str
    name: str
    block: str
    population: int = 0
    population_exposed: int = 0
    flooded_fraction: float = 0.0
    flooded_area_ha: float = 0.0
    total_area_ha: float = 0.0
    cropland_flooded_ha: float = 0.0
    built_up_flooded_ha: float = 0.0
    roads_cut_km: float = 0.0
    isolated: bool = False
    dry_disconnected: bool = False
    isolated_population: int = 0
    facilities_flooded: int = 0
    priority_score: float = 0.0
    priority_breakdown: dict[str, float] = Field(default_factory=dict)
    nearest_safe_shelter_id: str | None = None
    safe_shelter_distance_km: float | None = None
    rank: int = 1


class ImpactResponse(BaseModel):
    event_id: str
    villages: list[VillageFeature] = Field(default_factory=list)
    total_flooded_area_km2: float = 0.0
    total_population_exposed: int = 0
    total_isolated_villages: int = 0
    total_isolated_population: int = 0
    total_roads_cut_km: float = 0.0
    summary: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------

class RouteResponse(BaseModel):
    has_route: bool = True
    status: str = "ok"
    origin: dict[str, Any] = Field(default_factory=dict)
    destination_shelter: dict[str, Any] | None = None
    distance_km: float = 0.0
    eta_minutes: float = 0.0
    polyline: list[list[float]] = Field(
        default_factory=list,
        description="List of [lon, lat] pairs",
    )
    alternate: list[list[float]] = Field(
        default_factory=list,
        description="Alternate route polyline",
    )
    has_alternate: bool = False
    alternate_status: str | None = None
    alternate_message: str | None = None
    alternate_shared_fraction: float | None = None
    alternate_distance_km: float | None = None
    alternate_eta_minutes: float | None = None
    assumptions: list[str] = Field(default_factory=list)
    staging_hint: dict[str, Any] | None = None
    geojson: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class AlertRequest(BaseModel):
    zone: str = Field(description="Zone ID or name")
    severity: str = Field(default="warning", description="advisory | warning | evacuate")
    language: str = Field(default="en", description="en | hi | as | bn")
    nearest_shelter: str | None = None
    action: str | None = None


class AlertResponse(BaseModel):
    zone_id: str
    zone_name: str
    severity: str
    language: str
    is_cutoff: bool = False
    text: str
    char_count: int
    encoding: str
    sms_segments: int
    chars_remaining_in_segment: int
    is_machine_drafted: bool = False
    native_speaker_review_needed: bool = False
    review_disclaimer: str | None = None
    cap_xml: str
    ivr_script: str | None = None
    push_notification: dict[str, Any] | None = None


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
    lat: float | None = 24.825
    lon: float | None = 92.800
    river_name: str | None = "Barak River"
    station_location: str | None = "Silchar / Cachar, Assam"
    coordinates: list[float] = Field(default_factory=lambda: [92.8, 24.825])
    elevation_m: float | None = None
    model_source: str = "ECMWF GloFAS v4.0 via Open-Meteo Flood API"
    layer_provenance: str = "REAL (modelled, GloFAS-derived)"
    fetch_timestamp: str | None = None
    source_mode: str = "live"
    current_discharge_m3s: float = 0.0
    peak_forecast_discharge_m3s: float = 0.0
    trend: str = "stable"
    flood_severity: str = "moderate"
    discharge_m3s: list[float] = Field(default_factory=list, description="Daily discharge forecast in m³/s")
    dates: list[str] = Field(default_factory=list, description="ISO date strings matching discharge values")
    daily_forecast: list[dict[str, Any]] = Field(default_factory=list)
    disclaimer: str | None = None
    source: str = "open-meteo"


# ---------------------------------------------------------------------------
# What-If
# ---------------------------------------------------------------------------

class WhatIfResponse(BaseModel):
    event_id: str
    delta_m: float
    effective_water_level_m: float = 3.25
    h_star_baseline_m: float = 3.25
    snapped_delta_m: float = 0.0
    layer_provenance: str = "DERIVED (HAND Water-Level Scenario)"
    geojson_file: str = ""
    metrics: dict[str, Any] = Field(default_factory=dict)
    comparison_with_observed_unet: dict[str, Any] = Field(default_factory=dict)
    zones: list[dict[str, Any]] = Field(default_factory=list)
    available_deltas: list[float] = Field(default_factory=list)
    rainfall_mm: float | None = None
    risk_tile_url: str = ""
    stats: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Generic error body
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    code: int
    message: str
