"""GET /events and GET /events/{id} – event list and detail."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException

from models.schemas import EventDetail, EventSummary, ImpactResponse, VillageFeature
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
                "flood_mask_unet_tif": f"/static/events/{normalized_id}/flood_mask_unet.tif",
                "flood_polygons_unet_geojson": f"/static/events/{normalized_id}/flood_polygons_unet.geojson",
                "flood_confidence_unet_tif": f"/static/events/{normalized_id}/flood_confidence_unet.tif",
                "villages_geojson": f"/static/events/{normalized_id}/villages.geojson",
                "shelters_geojson": f"/static/events/{normalized_id}/shelters.geojson",
                "roads_geojson": f"/static/events/{normalized_id}/roads.geojson",
                "impact_summary_json": f"/static/events/{normalized_id}/impact_summary.json",
            },
        )

    raise HTTPException(
        status_code=404,
        detail={"code": 404, "message": f"Event '{event_id}' not found"},
    )


@router.get("/{event_id}/impact", response_model=ImpactResponse)
async def get_event_impact(
    event_id: str,
    w_pop: float = 0.35,
    w_flood: float = 0.25,
    w_iso: float = 0.30,
    w_fac: float = 0.10,
) -> ImpactResponse:
    """Calculate and return ranked impact per settlement zone with custom priority weights."""
    normalized_id = event_id.replace("assam2022", "assam-2022")

    villages_data = load_fallback(f"events/{normalized_id}/villages.geojson")
    summary_data = load_fallback(f"events/{normalized_id}/impact_summary.json")

    if not villages_data:
        raise HTTPException(
            status_code=404,
            detail={"code": 404, "message": f"Impact data for event '{event_id}' not found"},
        )

    features = villages_data.get("features", [])
    if not features:
        return ImpactResponse(event_id=normalized_id)

    # Recalculate priority scores if custom weights are passed
    w_sum = w_pop + w_flood + w_iso + w_fac
    w_p = (w_pop / w_sum) if w_sum > 0 else 0.35
    w_f = (w_flood / w_sum) if w_sum > 0 else 0.25
    w_i = (w_iso / w_sum) if w_sum > 0 else 0.30
    w_c = (w_fac / w_sum) if w_sum > 0 else 0.10

    max_pop = max((f["properties"].get("population_exposed", 0) for f in features), default=1) or 1
    max_fac = max((f["properties"].get("facilities_flooded", 0) for f in features), default=1) or 1

    ranked_villages: list[VillageFeature] = []
    for f in features:
        p = f["properties"]
        pop_exp = p.get("population_exposed", 0)
        flood_frac = p.get("flooded_fraction", 0.0)
        is_isolated = p.get("isolated", False)
        fac_hit = p.get("facilities_flooded", 0)

        t_pop = (pop_exp / max_pop) * w_p
        t_flood = flood_frac * w_f
        t_iso = (1.0 if is_isolated else 0.0) * w_i
        t_fac = (fac_hit / max_fac) * w_c

        score = round((t_pop + t_flood + t_iso + t_fac) * 100.0, 1)

        v_feature = VillageFeature(
            village_id=p.get("zone_id", f.get("id", "unknown")),
            name=p.get("name", "Unnamed Zone"),
            block=p.get("block", "Silchar"),
            population=p.get("population", 0),
            population_exposed=pop_exp,
            flooded_fraction=flood_frac,
            flooded_area_ha=p.get("flooded_area_ha", 0.0),
            total_area_ha=p.get("total_area_ha", 0.0),
            cropland_flooded_ha=p.get("cropland_flooded_ha", 0.0),
            built_up_flooded_ha=p.get("built_up_flooded_ha", 0.0),
            roads_cut_km=p.get("roads_cut_km", 0.0),
            isolated=is_isolated,
            dry_disconnected=p.get("dry_disconnected", False),
            isolated_population=p.get("isolated_population", 0),
            facilities_flooded=fac_hit,
            priority_score=score,
            priority_breakdown={
                "population_exposed_term": round(t_pop * 100.0, 1),
                "flooded_fraction_term": round(t_flood * 100.0, 1),
                "isolation_term": round(t_iso * 100.0, 1),
                "critical_facilities_term": round(t_fac * 100.0, 1),
            },
            nearest_safe_shelter_id=p.get("nearest_safe_shelter_id"),
            safe_shelter_distance_km=p.get("safe_shelter_distance_km"),
        )
        ranked_villages.append(v_feature)

    # Sort descending by priority score and assign rank
    ranked_villages.sort(key=lambda v: v.priority_score, reverse=True)
    for idx, v in enumerate(ranked_villages, start=1):
        v.rank = idx

    cutoff_count = sum(1 for v in ranked_villages if v.isolated)
    isolated_pop = sum(v.isolated_population for v in ranked_villages)
    total_exposed = sum(v.population_exposed for v in ranked_villages)
    total_area_ha = sum(v.flooded_area_ha for v in ranked_villages)

    return ImpactResponse(
        event_id=normalized_id,
        villages=ranked_villages,
        total_flooded_area_km2=round(total_area_ha / 100.0, 2),
        total_population_exposed=total_exposed,
        total_isolated_villages=cutoff_count,
        total_isolated_population=isolated_pop,
        total_roads_cut_km=summary_data.get("total_roads_cut_km", 0.0) if summary_data else 0.0,
        summary=summary_data or {},
    )
