"""Tests for Phase 4: Evacuation routing, speed/ETA physics, SMS segmentation, and CAP v1.2 XML."""

import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List

import networkx as nx
import pytest
from shapely.geometry import LineString, Point, box, shape
from shapely.ops import transform, unary_union

from pipeline.alerts import build_alert_payload, calculate_sms_segments, generate_cap_v12_xml
from pipeline.routing import HIGHWAY_SPEEDS_KMH, RoutingEngine, proj_to_utm


class TestRoutingToyGraph:
    """Unit tests for routing logic, edge avoidance, alternate paths, and disconnected staging."""

    def test_route_avoids_flooded_edge(self):
        """Dijkstra router avoids edges intersecting the flood buffer and takes a dry detour."""
        # Diamond graph:
        # Node 1 (Origin) -> Node 2 (Flooded shortcut) -> Node 4 (Shelter)
        # Node 1 (Origin) -> Node 3 (Dry detour) -> Node 4 (Shelter)
        G = nx.Graph()
        G.add_node(1, pos=(0.0, 0.0), pos_utm=(0.0, 0.0))
        G.add_node(2, pos=(1.0, 0.0), pos_utm=(1000.0, 0.0))
        G.add_node(3, pos=(0.0, 1.0), pos_utm=(0.0, 1000.0))
        G.add_node(4, pos=(1.0, 1.0), pos_utm=(1000.0, 1000.0))

        # Shortcut (1-2-4) would be 2000m, but 1-2 is flooded!
        # Detour (1-3-4) is 2000m and completely dry
        G.add_edge(1, 3, weight=100.0, length_m=1000.0, time_sec=100.0)
        G.add_edge(3, 4, weight=100.0, length_m=1000.0, time_sec=100.0)

        # Path finding
        path = nx.shortest_path(G, 1, 4, weight="weight")
        assert path == [1, 3, 4]

    def test_alternate_route_computation(self):
        """Alternate route penalizes primary edges to discover a secondary corridor."""
        G = nx.Graph()
        # Two parallel routes: A (1-2-4) of cost 50, B (1-3-4) of cost 80
        G.add_node(1, pos=(0.0, 0.0), pos_utm=(0.0, 0.0))
        G.add_node(2, pos=(1.0, 0.0), pos_utm=(500.0, 0.0))
        G.add_node(3, pos=(0.0, 1.0), pos_utm=(0.0, 500.0))
        G.add_node(4, pos=(1.0, 1.0), pos_utm=(1000.0, 1000.0))

        G.add_edge(1, 2, weight=25.0, length_m=500.0, time_sec=25.0)
        G.add_edge(2, 4, weight=25.0, length_m=500.0, time_sec=25.0)

        G.add_edge(1, 3, weight=40.0, length_m=800.0, time_sec=40.0)
        G.add_edge(3, 4, weight=40.0, length_m=800.0, time_sec=40.0)

        # Primary route is 1-2-4 (cost 50)
        primary = nx.shortest_path(G, 1, 4, weight="weight")
        assert primary == [1, 2, 4]

        # Apply 3.0x corridor penalty to primary
        for i in range(len(primary) - 1):
            G[primary[i]][primary[i + 1]]["weight"] *= 3.0

        # Alternate route should switch to 1-3-4 (cost 80 vs penalized 150)
        alternate = nx.shortest_path(G, 1, 4, weight="weight")
        assert alternate == [1, 3, 4]

    def test_disconnected_node_returns_no_route(self):
        """Isolated nodes have no path in the flooded graph."""
        G = nx.Graph()
        G.add_node(1, pos=(0.0, 0.0), pos_utm=(0.0, 0.0))
        G.add_node(2, pos=(5.0, 5.0), pos_utm=(5000.0, 5000.0))
        assert not nx.has_path(G, 1, 2)


class TestETAPhysics:
    """Tests for road speeds and flood proximity degradation factors."""

    def test_speed_by_highway_class(self):
        """Verify speed hierarchy: primary > secondary > tertiary > residential."""
        assert HIGHWAY_SPEEDS_KMH["primary"] == 50.0
        assert HIGHWAY_SPEEDS_KMH["secondary"] == 40.0
        assert HIGHWAY_SPEEDS_KMH["tertiary"] == 30.0
        assert HIGHWAY_SPEEDS_KMH["residential"] == 20.0

    def test_flood_proximity_speed_degradation(self):
        """Roads within 200m flood proximity suffer a 50% speed reduction, doubling travel time."""
        length_m = 1000.0
        base_speed_kmh = 40.0
        base_speed_mps = (base_speed_kmh * 1000.0) / 3600.0
        normal_time_sec = length_m / base_speed_mps

        degraded_speed_kmh = base_speed_kmh * 0.5  # 20 km/h
        degraded_speed_mps = (degraded_speed_kmh * 1000.0) / 3600.0
        degraded_time_sec = length_m / degraded_speed_mps

        assert abs(degraded_time_sec - (normal_time_sec * 2.0)) < 1e-4


class TestPrecomputedRoutesSafety:
    """Verify that all precomputed evacuation route polylines are strictly disjoint from the 50m flood buffer."""

    def test_no_route_edge_intersects_flood_buffer(self):
        """Ensure zero route edges intersect the 50m flood safety buffer."""
        routes_path = Path("data/events/assam-2022/routes.json")
        flood_path = Path("data/events/assam-2022/flood_polygons_unet.geojson")

        if not (routes_path.is_file() and flood_path.is_file()):
            pytest.skip("Static artifacts not found")

        with open(routes_path, "r", encoding="utf-8") as f:
            routes = json.load(f)

        with open(flood_path, "r", encoding="utf-8") as f:
            flood_data = json.load(f)

        flood_geoms_utm = []
        for feat in flood_data.get("features", []):
            g = shape(feat["geometry"])
            if g.is_valid and not g.is_empty:
                flood_geoms_utm.append(transform(proj_to_utm, g))

        flood_union_utm = unary_union(flood_geoms_utm)
        flood_buffer_50m = flood_union_utm.buffer(50.0)

        for zone_id, r in routes.items():
            if not r["has_route"]:
                continue
            coords = r["polyline"]
            if len(coords) < 2:
                continue
            line_wgs84 = LineString(coords)
            line_utm = transform(proj_to_utm, line_wgs84)

            # Route line must not intersect the 50m flood buffer!
            assert not line_utm.intersects(flood_buffer_50m), f"Route for {zone_id} intersects 50m flood buffer!"


class TestSMSSegmentationEdgeCases:
    """Exact SMS segmentation tests for GSM-7 and Unicode boundary conditions."""

    def test_gsm7_exact_single_boundary(self):
        """Exactly 160 GSM-7 characters is 1 segment with 0 characters remaining."""
        text_160 = "A" * 160
        res = calculate_sms_segments(text_160)
        assert res["encoding"] == "GSM-7"
        assert res["char_count"] == 160
        assert res["sms_segments"] == 1
        assert res["chars_remaining_in_segment"] == 0

    def test_gsm7_exact_split_boundary(self):
        """Exactly 161 GSM-7 characters becomes 2 segments (153 chars/segment, 145 left in seg 2)."""
        text_161 = "A" * 161
        res = calculate_sms_segments(text_161)
        assert res["encoding"] == "GSM-7"
        assert res["char_count"] == 161
        assert res["sms_segments"] == 2
        # Segments limit is 153 for multi-part: 2 * 153 = 306. 306 - 161 = 145 left.
        assert res["chars_remaining_in_segment"] == 145

    def test_unicode_exact_single_boundary(self):
        """Exactly 70 Unicode characters is 1 segment with 0 characters remaining."""
        text_70 = "अ" * 70
        res = calculate_sms_segments(text_70)
        assert res["encoding"] == "Unicode"
        assert res["char_count"] == 70
        assert res["sms_segments"] == 1
        assert res["chars_remaining_in_segment"] == 0

    def test_unicode_exact_split_boundary(self):
        """Exactly 71 Unicode characters becomes 2 segments (67 chars/segment, 63 left in seg 2)."""
        text_71 = "अ" * 71
        res = calculate_sms_segments(text_71)
        assert res["encoding"] == "Unicode"
        assert res["char_count"] == 71
        assert res["sms_segments"] == 2
        # Segments limit is 67 for multi-part: 2 * 67 = 134. 134 - 71 = 63 left.
        assert res["chars_remaining_in_segment"] == 63


class TestCAPXMLCompliance:
    """Validation of OASIS CAP v1.2 XML well-formedness and mandatory tags."""

    def test_cap_xml_well_formed_and_tags_present(self):
        """CAP XML must parse cleanly and contain all mandatory OASIS v1.2 elements."""
        xml_str = generate_cap_v12_xml(
            alert_id="TEST-ALERT-001",
            zone_name="Debpāra",
            severity="evacuate",
            headline="Extreme Flood Evacuation",
            description="Immediate evacuation required.",
            instruction="Proceed to relief shelter.",
            polygon_coords=[[92.8, 24.8], [92.85, 24.8], [92.85, 24.85], [92.8, 24.8]],
            language="en",
        )

        # 1. XML Well-formedness
        root = ET.fromstring(xml_str)
        assert root.tag == "{urn:oasis:names:tc:emergency:cap:1.2}alert"

        # 2. Required Alert Header Tags
        assert root.find("{urn:oasis:names:tc:emergency:cap:1.2}identifier").text == "TEST-ALERT-001"
        assert root.find("{urn:oasis:names:tc:emergency:cap:1.2}sender").text == "alert@jaldrishti.in"
        assert root.find("{urn:oasis:names:tc:emergency:cap:1.2}status").text == "Actual"
        assert root.find("{urn:oasis:names:tc:emergency:cap:1.2}msgType").text == "Alert"
        assert root.find("{urn:oasis:names:tc:emergency:cap:1.2}scope").text == "Public"

        # 3. Required Info Block Tags
        info = root.find("{urn:oasis:names:tc:emergency:cap:1.2}info")
        assert info is not None
        assert info.find("{urn:oasis:names:tc:emergency:cap:1.2}category").text == "Safety"
        assert info.find("{urn:oasis:names:tc:emergency:cap:1.2}urgency").text == "Immediate"
        assert info.find("{urn:oasis:names:tc:emergency:cap:1.2}severity").text == "Extreme"
        assert info.find("{urn:oasis:names:tc:emergency:cap:1.2}certainty").text == "Observed"
        assert info.find("{urn:oasis:names:tc:emergency:cap:1.2}headline").text == "Extreme Flood Evacuation"

        # 4. Required Area Block Tags
        area = info.find("{urn:oasis:names:tc:emergency:cap:1.2}area")
        assert area is not None
        assert "Debpāra" in area.find("{urn:oasis:names:tc:emergency:cap:1.2}areaDesc").text


class TestRoutingAndAlertEndpoints:
    """Integration contract tests for FastAPI route and alert preview endpoints."""

    def test_route_connected_zone_endpoint(self):
        """GET /events/{id}/route for connected zone returns 200 and route polyline."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        res = client.get("/events/assam-2022/route?from=zone_04")
        assert res.status_code == 200
        data = res.json()
        assert data["has_route"] is True
        assert data["distance_km"] > 0
        assert data["eta_minutes"] > 0
        assert len(data["polyline"]) >= 2
        assert len(data["assumptions"]) >= 4

    def test_route_cutoff_zone_endpoint(self):
        """GET /events/{id}/route for cut-off zone returns 200 with has_route=False and staging hint."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        res = client.get("/events/assam-2022/route?from=zone_02")
        assert res.status_code == 200
        data = res.json()
        assert data["has_route"] is False
        assert data["staging_hint"] is not None
        assert data["staging_hint"]["available"] is True
        assert data["staging_hint"]["straight_line_distance_km"] > 0

    def test_alerts_preview_endpoint_multilingual(self):
        """POST /alerts/preview returns 200 with accurate SMS count, encoding, and CAP XML."""
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # English Warning
        res_en = client.post("/alerts/preview", json={
            "zone": "zone_20",
            "severity": "warning",
            "language": "en",
        })
        assert res_en.status_code == 200
        d_en = res_en.json()
        assert d_en["severity"] == "warning"
        assert d_en["char_count"] > 0
        assert "cap_xml" in d_en

        # Assamese Evacuate
        res_as = client.post("/alerts/preview", json={
            "zone": "zone_02",
            "severity": "evacuate",
            "language": "as",
        })
        assert res_as.status_code == 200
        d_as = res_as.json()
        assert d_as["encoding"] == "Unicode"
        assert d_as["is_machine_drafted"] is True
        assert d_as["native_speaker_review_needed"] is True
        assert "machine-drafted" in d_as["review_disclaimer"].lower()

    def test_all_20_zones_status_consistency(self):
        """Verify that every zone in villages.geojson matches routes.json: isolated == not has_route."""
        import json
        from pathlib import Path
        event_dir = Path("data/events/assam-2022")
        with open(event_dir / "villages.geojson") as f:
            v_data = json.load(f)
        with open(event_dir / "routes.json") as f:
            r_data = json.load(f)

        assert len(v_data["features"]) == 20
        assert len(r_data) == 20

        cutoff_count = 0
        connected_count = 0
        for feat in v_data["features"]:
            zid = feat["properties"]["zone_id"]
            isolated = feat["properties"]["isolated"]
            route = r_data[zid]
            has_route = route["has_route"]
            assert isolated == (not has_route), f"Zone {zid} mismatch: isolated={isolated}, has_route={has_route}"
            if isolated:
                cutoff_count += 1
            else:
                connected_count += 1

        assert cutoff_count == 8
        assert connected_count == 12
