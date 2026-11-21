"""Phase 4: Evacuation routing engine and offline precomputation.

Features:
- Road network graph with flood severing (50m safety buffer).
- Speed degradation factor (0.5x speed, 1.5x impedance cost) within 200m flood proximity.
- Speeds by OSM highway class.
- Multi-target shortest path to nearest safe shelter.
- Alternate route computation via edge penalization.
- Cut-off zone staging hint: shortest Euclidean transfer vector from the isolated road cluster
  to the nearest passable network component (boat or air staging).
- Full offline static route precomputation for all settlement zones.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import networkx as nx
import pyproj
from shapely.geometry import LineString, Point, box, mapping, shape
from shapely.ops import transform, unary_union

BBOX_CACHAR = [92.70, 24.75, 92.90, 24.90]
UTM_CRS = "EPSG:32646"
WGS84_CRS = "EPSG:4326"

proj_to_utm = pyproj.Transformer.from_crs(WGS84_CRS, UTM_CRS, always_xy=True).transform
proj_to_wgs84 = pyproj.Transformer.from_crs(UTM_CRS, WGS84_CRS, always_xy=True).transform

# Speeds by OSM highway class in km/h
HIGHWAY_SPEEDS_KMH: Dict[str, float] = {
    "motorway": 80.0,
    "trunk": 60.0,
    "primary": 50.0,
    "secondary": 40.0,
    "tertiary": 30.0,
    "unclassified": 25.0,
    "residential": 20.0,
    "living_street": 15.0,
    "service": 15.0,
}
DEFAULT_SPEED_KMH = 20.0
FLOOD_BUFFER_M = 50.0
PROXIMITY_BUFFER_M = 200.0
PROXIMITY_SPEED_DEGRADATION = 0.5  # 50% speed reduction near flood water
PROXIMITY_COST_MULTIPLIER = 1.5  # Extra routing impedance penalty


class RoutingEngine:
    """Evacuation routing engine operating on OSM road graphs severed by SAR flood polygons."""

    def __init__(
        self,
        event_dir: Path | str = "data/events/assam-2022",
    ) -> None:
        self.event_dir = Path(event_dir)
        self.G_dry = nx.Graph()
        self.G_flooded = nx.Graph()
        self.shelters: List[Dict[str, Any]] = []
        self.safe_shelters: List[Dict[str, Any]] = []
        self.shelter_entry_nodes: Dict[str, int] = {}
        self.zones: List[Dict[str, Any]] = []
        self.assumptions: List[str] = [
            "50m flood safety buffer applied to road severing (bridges and elevated viaducts are not modelled).",
            "Speeds by OSM road class: trunk 60 km/h, primary 50 km/h, secondary 40 km/h, tertiary 30 km/h, residential 20 km/h.",
            "0.5x speed degradation and 1.5x impedance penalty applied to roads within 200m flood proximity.",
            "Multi-target shortest path selects the optimal destination among all 32 safe facilities.",
            "Alternate route must share <= 80% length with primary corridor (otherwise flagged as 'no distinct alternate').",
            "Boat/air staging egress hint is a decision-support suggestion, not an official procedure.",
            "Results are bounded within Cachar study window; road truncation at edges may overstate cut-offs for border zones.",
        ]
        self._load_and_build()

    def _load_and_build(self) -> None:
        """Load cached OSM infrastructure, shelters, and flood polygons to construct routing graphs."""
        # 1. Load OSM Cache
        osm_path = self.event_dir / "osm_cache.json"
        if not osm_path.is_file():
            raise FileNotFoundError(f"Missing OSM cache at {osm_path}")

        with open(osm_path, "r", encoding="utf-8") as f:
            osm_data = json.load(f)
        nodes = {int(k): (v[0], v[1]) for k, v in osm_data["nodes"].items()}
        ways = {int(k): (v[0], v[1]) for k, v in osm_data["ways"].items()}

        # 2. Load Shelters
        shelters_path = self.event_dir / "shelters.geojson"
        if not shelters_path.is_file():
            raise FileNotFoundError(f"Missing shelters at {shelters_path}")

        with open(shelters_path, "r", encoding="utf-8") as f:
            shelters_geojson = json.load(f)

        self.shelters = []
        for feat in shelters_geojson.get("features", []):
            coords = feat["geometry"]["coordinates"]
            props = feat["properties"]
            self.shelters.append({
                "shelter_id": props["shelter_id"],
                "name": props["name"],
                "facility_type": props["facility_type"],
                "is_safe": props["is_safe"],
                "lon": coords[0],
                "lat": coords[1],
                "point": Point(coords[0], coords[1]),
            })
        self.safe_shelters = [s for s in self.shelters if s["is_safe"]]

        # 3. Load Flood Polygons (U-Net primary)
        flood_path = self.event_dir / "flood_polygons_unet.geojson"
        if not flood_path.is_file():
            raise FileNotFoundError(f"Missing flood polygons at {flood_path}")

        with open(flood_path, "r", encoding="utf-8") as f:
            flood_geojson = json.load(f)

        flood_geoms_utm = []
        for feat in flood_geojson.get("features", []):
            geom = shape(feat["geometry"])
            if geom.is_valid and not geom.is_empty:
                geom_utm = transform(proj_to_utm, geom)
                flood_geoms_utm.append(geom_utm)

        flood_union_utm = unary_union(flood_geoms_utm)
        flood_buffer_50m = flood_union_utm.buffer(FLOOD_BUFFER_M)
        flood_proximity_200m = flood_union_utm.buffer(PROXIMITY_BUFFER_M)

        # 4. Load Settlement Zones
        villages_path = self.event_dir / "villages.geojson"
        if villages_path.is_file():
            with open(villages_path, "r", encoding="utf-8") as f:
                v_data = json.load(f)
            self.zones = [
                {
                    "zone_id": f["properties"]["zone_id"],
                    "name": f["properties"]["name"],
                    "rank": f["properties"].get("rank", 1),
                    "isolated": f["properties"].get("isolated", False),
                    "center": f["properties"].get("center") or [shape(f["geometry"]).centroid.x, shape(f["geometry"]).centroid.y],
                    "centroid": shape(f["geometry"]).centroid,
                }
                for f in v_data.get("features", [])
            ]

        # 5. Build Road Graphs
        study_box = box(BBOX_CACHAR[0], BBOX_CACHAR[1], BBOX_CACHAR[2], BBOX_CACHAR[3])
        drivable_highways = set(HIGHWAY_SPEEDS_KMH.keys())

        self.G_dry = nx.Graph()
        self.G_flooded = nx.Graph()

        for wid, (refs, tags) in ways.items():
            highway = tags.get("highway")
            if highway not in drivable_highways:
                continue

            valid_nodes = [r for r in refs if r in nodes]
            if len(valid_nodes) < 2:
                continue

            name = tags.get("name") or f"Unnamed Road #{wid}"
            base_speed_kmh = HIGHWAY_SPEEDS_KMH.get(highway, DEFAULT_SPEED_KMH)

            for idx in range(len(valid_nodes) - 1):
                u = valid_nodes[idx]
                v = valid_nodes[idx + 1]

                p_u = Point(nodes[u][0], nodes[u][1])
                p_v = Point(nodes[v][0], nodes[v][1])

                if not (study_box.contains(p_u) or study_box.contains(p_v)):
                    continue

                u_utm = proj_to_utm(p_u.x, p_u.y)
                v_utm = proj_to_utm(p_v.x, p_v.y)
                seg_utm = LineString([u_utm, v_utm])
                length_m = seg_utm.length

                if length_m <= 0:
                    continue

                # Add to G_dry
                base_speed_mps = (base_speed_kmh * 1000.0) / 3600.0
                time_dry_sec = length_m / base_speed_mps

                self.G_dry.add_node(u, pos=(p_u.x, p_u.y), pos_utm=u_utm)
                self.G_dry.add_node(v, pos=(p_v.x, p_v.y), pos_utm=v_utm)
                self.G_dry.add_edge(
                    u, v,
                    weight=time_dry_sec,
                    length_m=length_m,
                    time_sec=time_dry_sec,
                    speed_kmh=base_speed_kmh,
                    highway=highway,
                    name=name,
                )

                # Check 50m flood severing
                if flood_buffer_50m.intersects(seg_utm):
                    continue  # Impassable edge, severed by floodwaters

                # Check 200m flood proximity
                is_near_flood = flood_proximity_200m.intersects(seg_utm)
                effective_speed_kmh = base_speed_kmh * (PROXIMITY_SPEED_DEGRADATION if is_near_flood else 1.0)
                effective_speed_mps = (effective_speed_kmh * 1000.0) / 3600.0
                traversal_time_sec = length_m / effective_speed_mps
                cost_weight = traversal_time_sec * (PROXIMITY_COST_MULTIPLIER if is_near_flood else 1.0)

                self.G_flooded.add_node(u, pos=(p_u.x, p_u.y), pos_utm=u_utm)
                self.G_flooded.add_node(v, pos=(p_v.x, p_v.y), pos_utm=v_utm)
                self.G_flooded.add_edge(
                    u, v,
                    weight=cost_weight,
                    length_m=length_m,
                    time_sec=traversal_time_sec,
                    speed_kmh=effective_speed_kmh,
                    highway=highway,
                    is_near_flood=is_near_flood,
                    name=name,
                )

        # 6. Map Shelters to nearest flooded road entry node
        self.shelter_entry_nodes = {}
        for s in self.safe_shelters:
            nearest_n = self._find_nearest_node(s["point"].x, s["point"].y, self.G_flooded)
            if nearest_n is not None:
                self.shelter_entry_nodes[s["shelter_id"]] = nearest_n

    def _find_nearest_node(self, lon: float, lat: float, graph: nx.Graph) -> Optional[int]:
        """Find the topologically closest node in graph to coordinate (lon, lat)."""
        if graph.number_of_nodes() == 0:
            return None
        min_dist_sq = float("inf")
        best_node = None
        for n, data in graph.nodes(data=True):
            p = data["pos"]
            d = (lon - p[0]) ** 2 + (lat - p[1]) ** 2
            if d < min_dist_sq:
                min_dist_sq = d
                best_node = n
        return best_node

    def find_route(
        self,
        from_lon: float,
        from_lat: float,
        target_shelter_id: Optional[str] = None,
        origin_label: str = "Origin",
    ) -> Dict[str, Any]:
        """Compute multi-target evacuation route, alternate route, or staging hint."""
        origin_node = self._find_nearest_node(from_lon, from_lat, self.G_flooded)

        if origin_node is None:
            return {
                "has_route": False,
                "status": "no_network",
                "origin": {"label": origin_label, "lon": from_lon, "lat": from_lat},
                "message": "No drivable road network found near origin.",
                "assumptions": self.assumptions,
            }

        # Filter candidate destination nodes
        candidate_shelters = []
        if target_shelter_id and target_shelter_id != "auto":
            matched = [s for s in self.safe_shelters if s["shelter_id"] == target_shelter_id]
            if matched and matched[0]["shelter_id"] in self.shelter_entry_nodes:
                candidate_shelters = matched
        else:
            candidate_shelters = [s for s in self.safe_shelters if s["shelter_id"] in self.shelter_entry_nodes]

        # Multi-target search
        best_path: Optional[List[int]] = None
        best_cost = float("inf")
        best_shelter: Optional[Dict[str, Any]] = None

        for s in candidate_shelters:
            dest_node = self.shelter_entry_nodes[s["shelter_id"]]
            if origin_node == dest_node:
                best_path = [origin_node]
                best_cost = 0.0
                best_shelter = s
                break
            if nx.has_path(self.G_flooded, origin_node, dest_node):
                try:
                    cost = nx.shortest_path_length(self.G_flooded, origin_node, dest_node, weight="weight")
                    if cost < best_cost:
                        best_cost = cost
                        best_path = nx.shortest_path(self.G_flooded, origin_node, dest_node, weight="weight")
                        best_shelter = s
                except nx.NetworkXNoPath:
                    continue

        # Case 1: Zone is Cut Off (No drivable road path exists)
        if best_path is None or best_shelter is None:
            staging_hint = self._compute_staging_hint(origin_node)
            return {
                "has_route": False,
                "status": "no_route",
                "origin": {"label": origin_label, "lon": from_lon, "lat": from_lat},
                "destination_shelter": None,
                "distance_km": 0.0,
                "eta_minutes": 0.0,
                "polyline": [],
                "alternate": [],
                "assumptions": self.assumptions,
                "staging_hint": staging_hint,
                "geojson": self._build_staging_geojson(from_lon, from_lat, staging_hint, origin_label),
            }

        # Extract primary route properties
        polyline_primary = [list(self.G_flooded.nodes[n]["pos"]) for n in best_path]
        dist_m = 0.0
        time_sec = 0.0
        for i in range(len(best_path) - 1):
            e = self.G_flooded.edges[best_path[i], best_path[i + 1]]
            dist_m += e["length_m"]
            time_sec += e["time_sec"]

        dist_km = round(dist_m / 1000.0, 2)
        eta_min = round(time_sec / 60.0, 1)

        # Case 2: Compute Alternate Route by penalizing primary edges
        orig_weights = {}
        for i in range(len(best_path) - 1):
            u, v = best_path[i], best_path[i + 1]
            orig_weights[(u, v)] = self.G_flooded[u][v]["weight"]
            self.G_flooded[u][v]["weight"] *= 3.0  # 3x corridor penalty

        alt_path: Optional[List[int]] = None
        alt_dist_km: Optional[float] = None
        alt_eta_min: Optional[float] = None
        dest_node = self.shelter_entry_nodes[best_shelter["shelter_id"]]
        shared_fraction: Optional[float] = None

        primary_edges = set()
        for i in range(len(best_path) - 1):
            u, v = best_path[i], best_path[i + 1]
            primary_edges.add((min(u, v), max(u, v)))

        try:
            if nx.has_path(self.G_flooded, origin_node, dest_node):
                candidate_alt = nx.shortest_path(self.G_flooded, origin_node, dest_node, weight="weight")
                alt_m = 0.0
                alt_sec = 0.0
                shared_length_m = 0.0
                for i in range(len(candidate_alt) - 1):
                    cu, cv = candidate_alt[i], candidate_alt[i + 1]
                    e = self.G_flooded.edges[cu, cv]
                    alt_m += e["length_m"]
                    alt_sec += e["time_sec"]
                    if (min(cu, cv), max(cu, cv)) in primary_edges:
                        shared_length_m += e["length_m"]

                shared_fraction = round(shared_length_m / max(dist_m, 1.0), 3)

                # Strict requirement: shared length must be <= 80% (divergence >= 20%)
                if shared_fraction <= 0.80 and len(candidate_alt) > 1:
                    alt_path = candidate_alt
                    alt_dist_km = round(alt_m / 1000.0, 2)
                    alt_eta_min = round(alt_sec / 60.0, 1)
        except Exception:
            pass
        finally:
            # Restore original weights
            for (u, v), w in orig_weights.items():
                self.G_flooded[u][v]["weight"] = w

        polyline_alternate = [list(self.G_flooded.nodes[n]["pos"]) for n in alt_path] if alt_path else []

        result = {
            "has_route": True,
            "status": "ok",
            "origin": {"label": origin_label, "lon": from_lon, "lat": from_lat},
            "destination_shelter": {
                "shelter_id": best_shelter["shelter_id"],
                "name": best_shelter["name"],
                "facility_type": best_shelter["facility_type"],
                "coordinates": [best_shelter["lon"], best_shelter["lat"]],
            },
            "distance_km": dist_km,
            "eta_minutes": eta_min,
            "polyline": polyline_primary,
            "has_alternate": alt_path is not None,
            "alternate_status": "ok" if alt_path else "no_distinct_alternate",
            "alternate_message": (
                "Distinct alternate evacuation corridor identified."
                if alt_path
                else "No distinct alternate route (shares >80% length with primary corridor)."
            ),
            "alternate_shared_fraction": shared_fraction,
            "alternate": polyline_alternate,
            "alternate_distance_km": alt_dist_km,
            "alternate_eta_minutes": alt_eta_min,
            "assumptions": self.assumptions,
            "staging_hint": None,
            "geojson": self._build_route_geojson(
                polyline_primary, polyline_alternate, dist_km, eta_min, alt_dist_km, alt_eta_min, best_shelter
            ),
        }
        return result

    def _compute_staging_hint(self, origin_node: int) -> Dict[str, Any]:
        """Compute the shortest Euclidean egress transfer vector to the safe network."""
        # Find origin node's connected component
        try:
            origin_comp = nx.node_connected_component(self.G_flooded, origin_node)
        except Exception:
            origin_comp = {origin_node}

        # Safe shelter nodes
        safe_nodes = set(self.shelter_entry_nodes.values())
        safe_comp = set()
        for s_node in safe_nodes:
            if s_node in self.G_flooded:
                try:
                    safe_comp.update(nx.node_connected_component(self.G_flooded, s_node))
                except Exception:
                    safe_comp.add(s_node)

        if not safe_comp:
            safe_comp = set(self.G_flooded.nodes()) - origin_comp

        if not safe_comp:
            return {
                "available": False,
                "message": "Entire regional network disconnected.",
            }

        min_dist_m = float("inf")
        best_u = origin_node
        best_v = list(safe_comp)[0]

        # Sample search over components to find Euclidean minimum
        origin_sample = list(origin_comp)[:300]
        safe_sample = list(safe_comp)[:500]

        for u in origin_sample:
            u_utm = self.G_flooded.nodes[u]["pos_utm"]
            for v in safe_sample:
                v_utm = self.G_flooded.nodes[v]["pos_utm"]
                dx = u_utm[0] - v_utm[0]
                dy = u_utm[1] - v_utm[1]
                d = dx * dx + dy * dy
                if d < min_dist_m:
                    min_dist_m = d
                    best_u = u
                    best_v = v

        straight_line_dist_km = round(math.sqrt(min_dist_m) / 1000.0, 2)
        pos_u = self.G_flooded.nodes[best_u]["pos"]
        pos_v = self.G_flooded.nodes[best_v]["pos"]

        return {
            "available": True,
            "provenance": "DERIVED (Nearest Topological Component Transfer)",
            "disclaimer": "Decision-support suggestion, not an official procedure.",
            "zone_staging_node_id": str(best_u),
            "zone_staging_coordinates": [round(pos_u[0], 6), round(pos_u[1], 6)],
            "safe_network_entry_node_id": str(best_v),
            "safe_network_entry_coordinates": [round(pos_v[0], 6), round(pos_v[1], 6)],
            "straight_line_distance_km": straight_line_dist_km,
            "recommended_mode": "Boat or Air Staging (decision-support suggestion, not an official procedure)",
            "evacuation_protocol": (
                f"Decision-support suggestion, not an official procedure: No road route available. Establish boat or all-terrain staging between zone coordinates "
                f"[{pos_u[0]:.4f}, {pos_u[1]:.4f}] and passable highway node [{pos_v[0]:.4f}, {pos_v[1]:.4f}] "
                f"({straight_line_dist_km} km straight-line distance)."
            ),
        }

    def _build_route_geojson(
        self,
        primary_poly: List[List[float]],
        alt_poly: List[List[float]],
        dist_km: float,
        eta_min: float,
        alt_dist_km: Optional[float],
        alt_eta_min: Optional[float],
        shelter: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Construct GeoJSON FeatureCollection containing primary route, alternate, and destination."""
        features = [
            {
                "type": "Feature",
                "id": "primary_route",
                "properties": {
                    "route_type": "primary",
                    "distance_km": dist_km,
                    "eta_minutes": eta_min,
                    "destination_name": shelter["name"],
                    "destination_type": shelter["facility_type"],
                    "layer": "DERIVED (Dijkstra Evacuation Route)",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": primary_poly,
                },
            },
            {
                "type": "Feature",
                "id": "shelter_destination",
                "properties": {
                    "name": shelter["name"],
                    "facility_type": shelter["facility_type"],
                    "shelter_id": shelter["shelter_id"],
                    "layer": "REAL (OpenStreetMap Safe Shelter)",
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [shelter["lon"], shelter["lat"]],
                },
            },
        ]
        if alt_poly:
            features.append({
                "type": "Feature",
                "id": "alternate_route",
                "properties": {
                    "route_type": "alternate",
                    "distance_km": alt_dist_km,
                    "eta_minutes": alt_eta_min,
                    "destination_name": shelter["name"],
                    "layer": "DERIVED (Penalized Alternate Route)",
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": alt_poly,
                },
            })
        return {
            "type": "FeatureCollection",
            "features": features,
        }

    def _build_staging_geojson(
        self,
        origin_lon: float,
        origin_lat: float,
        staging_hint: Dict[str, Any],
        origin_label: str,
    ) -> Dict[str, Any]:
        """Construct GeoJSON FeatureCollection for cut-off zone showing transfer vector."""
        features: List[Dict[str, Any]] = [
            {
                "type": "Feature",
                "id": "cutoff_origin",
                "properties": {
                    "name": origin_label,
                    "status": "CUT OFF",
                    "layer": "DERIVED (Hydraulically Severed Zone)",
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [origin_lon, origin_lat],
                },
            }
        ]
        if staging_hint.get("available"):
            u_pt = staging_hint["zone_staging_coordinates"]
            v_pt = staging_hint["safe_network_entry_coordinates"]
            features.extend([
                {
                    "type": "Feature",
                    "id": "staging_transfer_vector",
                    "properties": {
                        "name": "Boat / Air Transfer Vector",
                        "distance_km": staging_hint["straight_line_distance_km"],
                        "mode": staging_hint["recommended_mode"],
                        "disclaimer": "Decision-support suggestion, not an official procedure.",
                        "layer": "DERIVED (Euclidean Staging Vector - Not a road)",
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [u_pt, v_pt],
                    },
                },
                {
                    "type": "Feature",
                    "id": "safe_network_landing",
                    "properties": {
                        "name": "Passable Highway Landing Point",
                        "layer": "DERIVED (Safe Network Entry)",
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": v_pt,
                    },
                },
            ])
        return {
            "type": "FeatureCollection",
            "features": features,
        }


def precompute_all_zone_routes(
    event_dir: Path | str = "data/events/assam-2022",
) -> Dict[str, Any]:
    """Precompute evacuation routes or staging hints for all 20 zones and save for offline mode."""
    engine = RoutingEngine(event_dir)
    routes_by_zone = {}

    for z in engine.zones:
        z_id = z["zone_id"]
        c_lon, c_lat = z["center"]
        res = engine.find_route(c_lon, c_lat, origin_label=z["name"])
        routes_by_zone[z_id] = res

    out_file = Path(event_dir) / "routes.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(routes_by_zone, f, indent=2)

    # Mirror to web public directory
    web_file = Path("apps/web/public/data/events/assam-2022/routes.json")
    if web_file.parent.is_dir():
        with open(web_file, "w", encoding="utf-8") as f:
            json.dump(routes_by_zone, f, indent=2)

    connected_count = sum(1 for r in routes_by_zone.values() if r["has_route"])
    cutoff_count = sum(1 for r in routes_by_zone.values() if not r["has_route"])
    print(f"Precomputed routes for {len(routes_by_zone)} zones ({connected_count} connected, {cutoff_count} cut off).")
    print(f"Saved to {out_file} and mirrored to {web_file}.")
    return routes_by_zone


if __name__ == "__main__":
    precompute_all_zone_routes()
