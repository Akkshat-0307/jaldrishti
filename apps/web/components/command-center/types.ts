export type LayerProvenance = "REAL" | "DERIVED" | "SIMULATED";

export interface ZoneProperties {
  zone_id: string;
  rank: number;
  name: string;
  block: string;
  place_type: string;
  center?: [number, number];
  population: number;
  population_exposed: number;
  population_of_cutoff_zone: number;
  population_exposed_in_cutoff_zone: number;
  flooded_fraction: number;
  flooded_area_ha: number;
  total_area_ha: number;
  cropland_flooded_ha: number;
  cropland_flooded_or_waterlogged_ha: number;
  built_up_flooded_ha: number;
  roads_cut_km: number;
  roads_potentially_cut_km: number;
  isolated: boolean;
  dry_disconnected: boolean;
  isolated_population: number;
  is_on_boundary_edge: boolean;
  touches_window_edge: boolean;
  facilities_flooded: number;
  priority_score: number;
  priority_breakdown: {
    w_pop: number;
    w_flood: number;
    w_iso: number;
    w_fac: number;
  };
  nearest_safe_shelter_id?: string | null;
  safe_shelter_distance_km?: number | null;
  layer_type?: string;
  methodology_note?: string;
}

export interface ZoneFeature {
  type: "Feature";
  id: string;
  properties: ZoneProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface ShelterProperties {
  shelter_id: string;
  name: string;
  facility_type: string;
  is_safe: boolean;
  is_flooded: boolean;
  status: "SAFE" | "FLOODED / UNSAFE";
  layer?: string;
}

export interface ShelterFeature {
  type: "Feature";
  id: string;
  properties: ShelterProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface StagingHint {
  available: boolean;
  provenance: string;
  disclaimer: string;
  zone_staging_node_id?: string;
  zone_staging_coordinates?: [number, number];
  safe_network_entry_node_id?: string;
  safe_network_entry_coordinates?: [number, number];
  straight_line_distance_km?: number;
  recommended_mode?: string;
  evacuation_protocol?: string;
  message?: string;
}

export interface RouteItem {
  has_route: boolean;
  status: string;
  origin: {
    label: string;
    lon: number;
    lat: number;
  };
  destination_shelter?: {
    shelter_id: string;
    name: string;
    facility_type: string;
    is_safe: boolean;
    lon: number;
    lat: number;
  } | null;
  distance_km: number;
  eta_minutes: number;
  polyline: [number, number][];
  alternate?: [number, number][];
  has_alternate?: boolean;
  alternate_status?: string | null;
  alternate_message?: string | null;
  alternate_shared_fraction?: number | null;
  alternate_distance_km?: number | null;
  alternate_eta_minutes?: number | null;
  assumptions: string[];
  staging_hint?: StagingHint | null;
  geojson?: GeoJSON.FeatureCollection | null;
}

export interface ImpactSummary {
  event_id: string;
  region: string;
  timestamp: string;
  utm_crs: string;
  zones_count: number;
  total_population_exposed: number;
  total_cropland_flooded_ha: number;
  total_cropland_flooded_or_waterlogged_ha: number;
  total_built_up_flooded_ha: number;
  total_roads_cut_km: number;
  total_roads_potentially_cut_km: number;
  cutoff_zones_count: number;
  cutoff_zones_touching_edge_count: number;
  cutoff_zones_touching_edge: string[];
  cutoff_zones_robust_count: number;
  cutoff_zones_robust: string[];
  isolated_population: number;
  total_cutoff_zones_population: number;
  total_cutoff_zones_exposed_population: number;
  boundary_edge_zones_count: number;
  dry_disconnected_zones_count: number;
  safe_shelters_count: number;
  flooded_facilities_count: number;
  priority_formula: string;
  default_weights: {
    w_pop: number;
    w_flood: number;
    w_iso: number;
    w_fac: number;
  };
  methodological_notes: {
    isolated_population_definition: string;
    cropland_waterlogging_limitation: string;
    boundary_truncation_warning: string;
    roads_buffer_assumption: string;
  };
  provenance: {
    population_source: string;
    landcover_source: string;
    osm_infrastructure: string;
    flood_impact_metrics: string;
    settlement_boundaries: string;
  };
}

export interface RiverForecastPoint {
  date: string;
  discharge_m3s: number | null;
  mean_m3s: number | null;
  max_m3s: number | null;
  min_m3s: number | null;
}

export interface RiverOutlook {
  river_name: string;
  station_location: string;
  cell_label?: string;
  temporal_scope?: string;
  coordinates: [number, number];
  elevation_m: number;
  model_source: string;
  layer_provenance: string;
  fetch_timestamp?: string;
  source_mode: string;
  current_discharge_m3s: number;
  peak_forecast_discharge_m3s: number;
  trend: "rising" | "falling" | "stable";
  flood_severity?: string;
  daily_forecast: RiverForecastPoint[];
  disclaimer: string;
}

export interface WhatIfScenarioSummary {
  delta_m: number;
  delta_tag: string;
  effective_water_level_m: number;
  json_path: string;
  geojson_path: string;
  flooded_area_ha: number;
  exposed_population: number;
  cropland_waterlogged_ha: number;
  roads_potentially_cut_km: number;
  cutoff_zones_count: number;
  cutoff_zones_robust_count: number;
  isolated_population: number;
}

export interface ScenariosIndex {
  event_id: string;
  h_star_baseline_m: number;
  baseline_mode?: string;
  planning_aid_note?: string;
  alternative_baseline?: {
    type: string;
    h_star_m: number;
    note: string;
  };
  scenarios_count: number;
  available_deltas_m: number[];
  bands: {
    minimum: { delta_m: number; description: string };
    likely: { delta_m: number; description: string };
    maximum: { delta_m: number; description: string };
  };
  observed_reference: {
    source: string;
    flooded_area_ha: number;
    exposed_population: number;
    cutoff_zones_count: number;
  };
  scenarios: WhatIfScenarioSummary[];
}

export interface TimelineDateItem {
  date: string;
  label: string;
  stage: "pre_flood" | "peak" | "recession";
  satellite_scene_id: string;
  flooded_area_ha: number;
  flooded_area_km2: number;
  population_exposed: number;
  polygon_geojson: string | null;
  status_badge: string;
}

export interface TimelineData {
  event_id: string;
  description: string;
  provenance: string;
  dates: TimelineDateItem[];
}

export interface BeaconItem {
  id: string;
  lat: number;
  lon: number;
  timestamp: string;
  group_size: number;
  need_type: "medical" | "food" | "boat" | "multiple" | "other" | string;
  battery?: number | null;
  channel: "online" | "sms" | "nav_sim" | string;
  status: "new" | "assigned" | "en_route" | "rescued" | string;
  payload_code?: string;
  raw_hex?: string;
  note?: string | null;
  assigned_team?: string | null;
  nearest_zone_id?: string | null;
  zone_name?: string | null;
  is_cutoff?: boolean;
  touches_edge?: boolean;
  route_or_staging_hint?: string | null;
  provenance?: string;
}

export interface LayerState {
  showUnetFlood: boolean;
  showTierABaseline: boolean;
  showSettlements: boolean;
  showRoads: boolean;
  showShelters: boolean;
  showRoutes: boolean;
  showWhatIf: boolean;
  showRecession: boolean;
  showBeacons: boolean;
  opacityUnet: number;
  opacityTierA: number;
  opacityWhatIf: number;
  opacityRecession: number;
}

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  tabToActivate?: string;
  badge?: LayerProvenance;
}
