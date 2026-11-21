"""Tests for Phase 3: Impact assessment, cut-off village logic, and priority scoring."""

from typing import Any, Dict, List
import networkx as nx
import numpy as np
import pytest
from shapely.geometry import Point, Polygon, box
from shapely.ops import transform
import pyproj

from pipeline.impact import (
    calculate_priority_scores,
    perform_cutoff_analysis,
    proj_to_utm,
)


class TestCutoffLogic:
    """Tests for dual-graph reachability cut-off logic."""

    def test_cutoff_node_cut_by_flood(self):
        """A zone reachable in G_dry but disconnected in G_flooded is cut off by the flood."""
        # Graph:
        # Shelter S at (0, 0)
        # Bridge B at (1, 0)
        # Zone Z at (2, 0)
        # Dry edges: S - B - Z
        # Flooded edges: B - Z is severed by flood, so only S - B remains in G_flooded
        G_dry = nx.Graph()
        G_dry.add_node(1, pos=(0.0, 0.0))  # Shelter
        G_dry.add_node(2, pos=(1.0, 0.0))  # Bridge
        G_dry.add_node(3, pos=(2.0, 0.0))  # Zone
        G_dry.add_edge(1, 2, weight=100.0)
        G_dry.add_edge(2, 3, weight=100.0)

        G_flooded = nx.Graph()
        G_flooded.add_node(1, pos=(0.0, 0.0))
        G_flooded.add_node(2, pos=(1.0, 0.0))
        G_flooded.add_node(3, pos=(2.0, 0.0))
        G_flooded.add_edge(1, 2, weight=100.0)  # Edge (2, 3) cut!

        shelters = [{
            "shelter_id": "shelter_1",
            "name": "District Hospital",
            "is_safe": True,
            "point": Point(0.0, 0.0),
        }]

        zones = [{
            "zone_id": "zone_cutoff",
            "name": "Flooded Hamlet",
            "center": [2.0, 0.0],
        }]

        perform_cutoff_analysis(zones, shelters, G_dry, G_flooded)

        assert zones[0]["isolated"] is True
        assert zones[0]["dry_disconnected"] is False
        assert zones[0]["nearest_safe_shelter_id"] == "shelter_1"
        assert zones[0]["safe_shelter_distance_km"] == 0.2  # 200m / 1000 = 0.2 km

    def test_node_disconnected_in_dry_graph_is_not_flood_cutoff(self):
        """A zone with no road to a shelter even in dry conditions is a data gap, NOT a flood cut-off."""
        # Island zone with no connection to shelter even in dry graph
        G_dry = nx.Graph()
        G_dry.add_node(1, pos=(0.0, 0.0))  # Shelter
        G_dry.add_node(2, pos=(5.0, 5.0))  # Disconnected island zone

        G_flooded = nx.Graph()
        G_flooded.add_node(1, pos=(0.0, 0.0))
        G_flooded.add_node(2, pos=(5.0, 5.0))

        shelters = [{
            "shelter_id": "shelter_1",
            "name": "Health Centre",
            "is_safe": True,
            "point": Point(0.0, 0.0),
        }]

        zones = [{
            "zone_id": "zone_gap",
            "name": "Isolated Island",
            "center": [5.0, 5.0],
        }]

        perform_cutoff_analysis(zones, shelters, G_dry, G_flooded)

        assert zones[0]["isolated"] is False
        assert zones[0]["dry_disconnected"] is True
        assert zones[0]["nearest_safe_shelter_id"] is None

    def test_node_connected_in_both_graphs_is_not_cutoff(self):
        """A zone with an intact passable route to a shelter remains connected."""
        G_dry = nx.Graph()
        G_dry.add_node(1, pos=(0.0, 0.0))
        G_dry.add_node(2, pos=(1.0, 0.0))
        G_dry.add_edge(1, 2, weight=150.0)

        G_flooded = nx.Graph()
        G_flooded.add_node(1, pos=(0.0, 0.0))
        G_flooded.add_node(2, pos=(1.0, 0.0))
        G_flooded.add_edge(1, 2, weight=150.0)

        shelters = [{
            "shelter_id": "shelter_1",
            "name": "Primary School",
            "is_safe": True,
            "point": Point(0.0, 0.0),
        }]

        zones = [{
            "zone_id": "zone_connected",
            "name": "Dry Highland Village",
            "center": [1.0, 0.0],
        }]

        perform_cutoff_analysis(zones, shelters, G_dry, G_flooded)

        assert zones[0]["isolated"] is False
        assert zones[0]["dry_disconnected"] is False
        assert zones[0]["nearest_safe_shelter_id"] == "shelter_1"
        assert zones[0]["safe_shelter_distance_km"] == 0.15


class TestZonalCalculations:
    """Tests for spatial zonal statistics and UTM area transformations."""

    def test_utm_area_computation(self):
        """Verify that area computed in UTM Zone 46N (EPSG:32646) matches physical metric units."""
        # 0.01 deg square around Silchar (approx 1 km x 1.1 km)
        poly_wgs84 = box(92.75, 24.80, 92.76, 24.81)
        poly_utm = transform(proj_to_utm, poly_wgs84)

        area_m2 = poly_utm.area
        area_ha = area_m2 / 10000.0

        # In Cachar latitude ~24.8 deg:
        # 0.01 deg lon ~ 1010 m
        # 0.01 deg lat ~ 1108 m
        # Expected area ~ 1,119,000 m2 ~ 112 ha
        assert 100.0 < area_ha < 125.0

    def test_toy_zonal_population_and_cropland(self):
        """Test zonal aggregation of population and landcover pixels on a synthetic grid."""
        # 10x10 synthetic raster representing 100m grid
        pop_grid = np.full((10, 10), 50.0)  # 50 people per cell
        landcover_grid = np.zeros((10, 10), dtype=np.uint8)
        landcover_grid[:5, :] = 40  # Cropland in top half (50 cells)
        landcover_grid[5:, :] = 50  # Built-up in bottom half (50 cells)

        # Flood mask covers top-left 5x5 quadrant (25 cells)
        flood_mask = np.zeros((10, 10), dtype=bool)
        flood_mask[:5, :5] = True

        total_pop = np.sum(pop_grid)
        exposed_pop = np.sum(pop_grid[flood_mask])

        assert total_pop == 5000.0
        assert exposed_pop == 1250.0  # 25 cells * 50

        # Cropland flooded: where flood_mask & landcover == 40
        cropland_flooded_cells = np.sum(flood_mask & (landcover_grid == 40))
        assert cropland_flooded_cells == 25  # All 25 cells in top-left are class 40

        # Built-up flooded: where flood_mask & landcover == 50
        built_up_flooded_cells = np.sum(flood_mask & (landcover_grid == 50))
        assert built_up_flooded_cells == 0  # None in top-left


class TestPriorityScoring:
    """Tests for explainable priority score formula and dynamic weight adjustment."""

    def test_default_priority_formula(self):
        """Priority score matches weighted sum with default weights (0.35, 0.25, 0.30, 0.10)."""
        zones = [
            {
                "zone_id": "z1",
                "population_exposed": 10000,
                "flooded_fraction": 0.50,
                "isolated": True,
                "facilities_flooded": 2,
            },
            {
                "zone_id": "z2",
                "population_exposed": 2000,
                "flooded_fraction": 0.10,
                "isolated": False,
                "facilities_flooded": 0,
            },
        ]

        calculate_priority_scores(zones, w_pop=0.35, w_flood=0.25, w_iso=0.30, w_fac=0.10)

        # z1 has max pop (10,000) and max fac (2)
        # P_norm = 1.0, F_norm = 0.5, I = 1.0, C_norm = 1.0
        # Score = (0.35*1.0 + 0.25*0.5 + 0.30*1.0 + 0.10*1.0) = 0.35 + 0.125 + 0.30 + 0.10 = 0.875 -> 87.5
        assert abs(zones[0]["priority_score"] - 87.5) <= 0.1
        assert zones[0]["rank"] == 1

        # z2: P_norm = 0.2, F_norm = 0.1, I = 0.0, C_norm = 0.0
        # Score = (0.35*0.2 + 0.25*0.1 + 0.0 + 0.0) = 0.07 + 0.025 = 0.095 -> 9.5
        assert abs(zones[1]["priority_score"] - 9.5) <= 0.1
        assert zones[1]["rank"] == 2

    def test_dynamic_reweighting(self):
        """Reweighting solely on isolation makes isolated zones jump to rank 1."""
        zones = [
            {
                "zone_id": "z_high_pop",
                "population_exposed": 50000,
                "flooded_fraction": 0.90,
                "isolated": False,  # Connected!
                "facilities_flooded": 5,
            },
            {
                "zone_id": "z_isolated",
                "population_exposed": 100,
                "flooded_fraction": 0.05,
                "isolated": True,  # Cut off!
                "facilities_flooded": 0,
            },
        ]

        # Heavy isolation weight: w_iso = 1.0, others = 0.0
        calculate_priority_scores(zones, w_pop=0.0, w_flood=0.0, w_iso=1.0, w_fac=0.0)

        # Isolated zone must be ranked #1
        assert zones[0]["zone_id"] == "z_isolated"
        assert zones[0]["rank"] == 1
        assert zones[0]["priority_score"] == 100.0

        assert zones[1]["zone_id"] == "z_high_pop"
        assert zones[1]["rank"] == 2
        assert zones[1]["priority_score"] == 0.0


class TestImpactAPI:
    """Verify FastAPI GET /events/{id}/impact endpoint."""

    def test_impact_endpoint_structure(self, client=None):
        """Test API returns 200 with 20 settlement zones and correct schema."""
        from fastapi.testclient import TestClient
        from main import app

        c = TestClient(app)
        res = c.get("/events/assam-2022/impact")
        assert res.status_code == 200

        data = res.json()
        assert data["event_id"] == "assam-2022"
        assert "villages" in data
        assert len(data["villages"]) == 20

        # Check top ranked village fields
        top = data["villages"][0]
        assert "village_id" in top
        assert "priority_score" in top
        assert "priority_breakdown" in top
        assert "isolated" in top
        assert "roads_cut_km" in top
        assert "flooded_area_ha" in top

        # Verify summary stats
        assert data["total_population_exposed"] == 101986
        assert data["total_isolated_villages"] == 8
        assert data["total_isolated_population"] == 100310
        assert data["total_roads_cut_km"] == 196.35

    def test_impact_endpoint_dynamic_weight_params(self):
        """Test API dynamically re-ranks when query params are provided."""
        from fastapi.testclient import TestClient
        from main import app

        c = TestClient(app)
        # Set w_iso high
        res = c.get("/events/assam-2022/impact?w_pop=0.0&w_flood=0.0&w_iso=1.0&w_fac=0.0")
        assert res.status_code == 200
        data = res.json()

        # All top 8 villages must be isolated
        for i in range(8):
            assert data["villages"][i]["isolated"] is True
            assert data["villages"][i]["priority_score"] == 100.0
