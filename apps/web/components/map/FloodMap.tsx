"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { getApiUrl } from "@/lib/api";
import type { BeaconItem } from "../command-center/types";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface FloodMapProps {
  initialModel?: "tier_a" | "unet" | "whatif";
  selectedZoneId?: string | null;
  onSelectZone?: (zoneId: string | null) => void;
  routeGeojson?: GeoJSON.FeatureCollection | null;
  whatifGeojsonUrl?: string | null;
  whatifAreaHa?: number | null;
  robustCutoffsOnly?: boolean;
  timelineGeojsonUrl?: string | null;
  showBeacons?: boolean;
}

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CARTO",
    },
  },
  layers: [
    {
      id: "carto-dark-tiles",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

interface FeatureProperties {
  zone_id?: string;
  name?: string;
  isolated?: boolean;
  priority_score?: number;
  population?: number;
  population_exposed?: number;
  flooded_area_ha?: number;
  flooded_fraction?: number | string;
  roads_cut_km?: number;
  safe_shelter_distance_km?: number;
  facility_type?: string;
  status?: string;
  is_safe?: boolean;
  highway?: string;
  is_cut?: boolean;
  [key: string]: unknown;
}

function isWebGLSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function FloodMap({
  initialModel = "unet",
  selectedZoneId = null,
  onSelectZone,
  routeGeojson = null,
  whatifGeojsonUrl = null,
  whatifAreaHa = null,
  robustCutoffsOnly = false,
  timelineGeojsonUrl,
  showBeacons = true,
}: FloodMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [webGLError, setWebGLError] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"tier_a" | "unet" | "whatif">(initialModel);
  const [showConfidence, setShowConfidence] = useState<boolean>(false);
  const [layerVisible, setLayerVisible] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [opacity, setOpacity] = useState(0.7);

  const [selectedFeature, setSelectedFeature] = useState<{
    type: "zone" | "shelter" | "road" | "beacon";
    title: string;
    properties: FeatureProperties;
  } | null>(null);

  // Sync routeGeojson when passed externally
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    const source = map.getSource("active-route") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(routeGeojson || EMPTY_GEOJSON);
    }
  }, [routeGeojson, mapLoaded]);

  // Sync live beacons from API onto map source
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const syncBeacons = async () => {
      try {
        const res = await fetch(getApiUrl("/beacons"));
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const geojson: GeoJSON.FeatureCollection = {
              type: "FeatureCollection",
              features: (list as BeaconItem[]).map((b: BeaconItem) => ({
                type: "Feature",
                id: b.id,
                geometry: { type: "Point", coordinates: [b.lon, b.lat] },
                properties: {
                  id: b.id,
                  status: b.status,
                  need_type: b.need_type,
                  group_size: b.group_size,
                  zone_name: b.zone_name,
                  assigned_team: b.assigned_team || "Unassigned",
                  note: b.note || "",
                  route_or_staging_hint: b.route_or_staging_hint || "",
                },
              })),
            };
            const src = map.getSource("rescue-beacons") as maplibregl.GeoJSONSource | undefined;
            if (src) {
              src.setData(geojson);
            }
          }
        }
      } catch {}
    };

    syncBeacons();
    const timer = setInterval(syncBeacons, 8000);
    return () => clearInterval(timer);
  }, [mapLoaded]);

  // Sync selectedZoneId with map highlight when changed externally
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !selectedZoneId) return;
    const map = mapRef.current;
    if (map.getLayer("zones-fill")) {
      map.setPaintProperty("zones-outline", "line-width", [
        "case",
        ["==", ["get", "zone_id"], selectedZoneId],
        2.5,
        1.2,
      ]);
    }
  }, [selectedZoneId, mapLoaded]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      if (!isWebGLSupported()) {
        console.warn("WebGL is not supported in this environment.");
        setWebGLError(true);
        return;
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: DARK_STYLE,
        center: [92.80, 24.83],
        zoom: 11.5,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    map.on("load", () => {
      // 1. Flood polygons sources
      map.addSource("tier-a-polygons", {
        type: "geojson",
        data: "/data/events/assam-2022/flood_polygons.geojson",
      });

      map.addSource("unet-polygons", {
        type: "geojson",
        data: "/data/events/assam-2022/flood_polygons_unet.geojson",
      });

      map.addSource("whatif-polygons", {
        type: "geojson",
        data: "/data/events/assam-2022/scenarios/scenario_p00.geojson",
      });

      // 2. Phase 3 Sources (Settlement Zones, Roads, Shelters)
      map.addSource("settlement-zones", {
        type: "geojson",
        data: "/data/events/assam-2022/villages.geojson",
      });

      map.addSource("roads-network", {
        type: "geojson",
        data: "/data/events/assam-2022/roads.geojson",
      });

      map.addSource("shelters-facilities", {
        type: "geojson",
        data: "/data/events/assam-2022/shelters.geojson",
      });

      // Layer: Settlement Zones Fill (Priority choropleth)
      map.addLayer({
        id: "zones-fill",
        type: "fill",
        source: "settlement-zones",
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "priority_score"],
            10, "#10B981",
            30, "#FBBF24",
            50, "#F97316",
            70, "#EF4444",
          ],
          "fill-opacity": 0.25,
        },
      });

      // Layer: Settlement Zones Boundaries
      map.addLayer({
        id: "zones-outline",
        type: "line",
        source: "settlement-zones",
        paint: {
          "line-color": "#38BDF8",
          "line-width": 1.2,
          "line-opacity": 0.6,
        },
      });

      // Layer: Cut-off zones highlighted boundary
      map.addLayer({
        id: "zones-cutoff-ring",
        type: "line",
        source: "settlement-zones",
        filter: ["==", ["get", "isolated"], true],
        paint: {
          "line-color": "#EF4444",
          "line-width": 2.5,
          "line-dasharray": [2, 2],
          "line-opacity": 0.9,
        },
      });

      // Layer: Tier A Fill
      map.addLayer({
        id: "tier-a-fill",
        type: "fill",
        source: "tier-a-polygons",
        paint: {
          "fill-color": "#3B82F6",
          "fill-opacity": 0.65,
        },
      });

      // Layer: Tier A Line
      map.addLayer({
        id: "tier-a-outline",
        type: "line",
        source: "tier-a-polygons",
        paint: {
          "line-color": "#60A5FA",
          "line-width": 1.0,
          "line-opacity": 0.8,
        },
      });

      // Layer: U-Net Fill
      map.addLayer({
        id: "unet-fill",
        type: "fill",
        source: "unet-polygons",
        paint: {
          "fill-color": "#10B981",
          "fill-opacity": 0.65,
        },
      });

      // Layer: U-Net Line
      map.addLayer({
        id: "unet-outline",
        type: "line",
        source: "unet-polygons",
        paint: {
          "line-color": "#34D399",
          "line-width": 1.2,
          "line-opacity": 0.85,
        },
      });

      // Layer: What-If Scenario Fill (Purple)
      map.addLayer({
        id: "whatif-fill",
        type: "fill",
        source: "whatif-polygons",
        paint: {
          "fill-color": "#8B5CF6",
          "fill-opacity": 0.65,
        },
      });

      // Layer: What-If Scenario Line
      map.addLayer({
        id: "whatif-outline",
        type: "line",
        source: "whatif-polygons",
        paint: {
          "line-color": "#A78BFA",
          "line-width": 1.2,
          "line-opacity": 0.85,
        },
      });

      // Layer: Roads Network (Drivable Roads)
      map.addLayer({
        id: "roads-lines",
        type: "line",
        source: "roads-network",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "is_cut"], true],
            "#EF4444", // Cut road segments in bright red
            "#64748B", // Intact dry roads in slate
          ],
          "line-width": [
            "case",
            ["==", ["get", "is_cut"], true],
            2.0,
            1.0,
          ],
          "line-opacity": 0.8,
        },
      });

      // Layer: Shelters & Facilities (Point circles)
      map.addLayer({
        id: "shelters-points",
        type: "circle",
        source: "shelters-facilities",
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "is_safe"], true],
            "#10B981", // Safe shelter in green
            "#EF4444", // Flooded facility in red
          ],
          "circle-radius": 5.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.95,
        },
      });

      // 3. Active Evacuation Route & Staging Vector Source
      map.addSource("active-route", {
        type: "geojson",
        data: EMPTY_GEOJSON,
      });

      // Primary Route Glow
      map.addLayer({
        id: "route-primary-glow",
        type: "line",
        source: "active-route",
        filter: ["==", ["get", "route_type"], "primary"],
        paint: {
          "line-color": "#06B6D4",
          "line-width": 6,
          "line-opacity": 0.45,
        },
      });

      // Primary Route Line
      map.addLayer({
        id: "route-primary-line",
        type: "line",
        source: "active-route",
        filter: ["==", ["get", "route_type"], "primary"],
        paint: {
          "line-color": "#22D3EE",
          "line-width": 3.5,
          "line-opacity": 0.95,
        },
      });

      // Alternate Route Line
      map.addLayer({
        id: "route-alternate-line",
        type: "line",
        source: "active-route",
        filter: ["==", ["get", "route_type"], "alternate"],
        paint: {
          "line-color": "#F59E0B",
          "line-width": 2.5,
          "line-dasharray": [3, 2],
          "line-opacity": 0.9,
        },
      });

      // Boat / Air Staging Transfer Vector
      map.addLayer({
        id: "route-staging-vector",
        type: "line",
        source: "active-route",
        filter: ["==", ["get", "id"], "staging_transfer_vector"],
        paint: {
          "line-color": "#EC4899",
          "line-width": 3,
          "line-dasharray": [2, 2],
          "line-opacity": 0.95,
        },
      });

      // Staging and Safe Highway Landing Points
      map.addLayer({
        id: "route-staging-points",
        type: "circle",
        source: "active-route",
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": "#EC4899",
          "circle-radius": 6.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        },
      });

      // 4. Rescue Beacons Source & Layers
      map.addSource("rescue-beacons", {
        type: "geojson",
        data: EMPTY_GEOJSON,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 35,
      });

      // Beacon clusters
      map.addLayer({
        id: "beacon-clusters",
        type: "circle",
        source: "rescue-beacons",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#E11D48",
          "circle-radius": ["step", ["get", "point_count"], 14, 5, 18, 10, 24],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#FFFFFF",
          "circle-opacity": 0.9,
        },
      });

      // Beacon cluster count label
      map.addLayer({
        id: "beacon-cluster-count",
        type: "symbol",
        source: "rescue-beacons",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 11,
        },
        paint: {
          "text-color": "#FFFFFF",
        },
      });

      // Beacon unclustered pulse for new status
      map.addLayer({
        id: "beacon-unclustered-pulse",
        type: "circle",
        source: "rescue-beacons",
        filter: ["all", ["!has", "point_count"], ["==", "status", "new"]],
        paint: {
          "circle-color": "#E11D48",
          "circle-radius": 14,
          "circle-opacity": 0.35,
        },
      });

      // Beacon unclustered markers
      map.addLayer({
        id: "beacon-unclustered-point",
        type: "circle",
        source: "rescue-beacons",
        filter: ["!has", "point_count"],
        paint: {
          "circle-color": [
            "match",
            ["get", "status"],
            "new",
            "#E11D48",
            "assigned",
            "#3B82F6",
            "en_route",
            "#A855F7",
            "rescued",
            "#10B981",
            "#F59E0B",
          ],
          "circle-radius": 6.5,
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 2,
          "circle-opacity": 1.0,
        },
      });

      // Interactions: Beacon Clusters Click
      map.on("click", "beacon-clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["beacon-clusters"],
        });
        const clusterId = features[0]?.properties?.cluster_id;
        const src = map.getSource("rescue-beacons") as maplibregl.GeoJSONSource;
        if (src && clusterId !== undefined) {
          src.getClusterExpansionZoom(clusterId).then((zoom) => {
            if (zoom !== undefined && e.lngLat) {
              map.easeTo({ center: e.lngLat, zoom });
            }
          }).catch(() => {});
        }
      });

      // Interactions: Beacon Point Click
      map.on("click", "beacon-unclustered-point", (e) => {
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        const props = (f.properties || {}) as FeatureProperties;
        setSelectedFeature({
          type: "beacon",
          title: `SOS: ${props.id || "Beacon"}`,
          properties: props,
        });
      });

      // Beacon cursor pointers
      ["beacon-clusters", "beacon-unclustered-point"].forEach((layer) => {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      });

      // Interactions: Click on Zone
      map.on("click", "zones-fill", (e) => {
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        const props = f.properties || {};
        setSelectedFeature({
          type: "zone",
          title: `Zone: ${props.name || props.zone_id}`,
          properties: props,
        });
        if (onSelectZone && props.zone_id) {
          onSelectZone(props.zone_id);
        }
      });

      // Click on Shelter
      map.on("click", "shelters-points", (e) => {
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        const props = f.properties || {};
        setSelectedFeature({
          type: "shelter",
          title: props.name || "Shelter Facility",
          properties: props,
        });
      });

      // Click on Road
      map.on("click", "roads-lines", (e) => {
        if (!e.features || e.features.length === 0) return;
        const f = e.features[0];
        const props = f.properties || {};
        setSelectedFeature({
          type: "road",
          title: props.name || "Road Segment",
          properties: props,
        });
      });

      // Cursor states
      const setPointer = () => { map.getCanvas().style.cursor = "pointer"; };
      const resetPointer = () => { map.getCanvas().style.cursor = ""; };
      map.on("mouseenter", "zones-fill", setPointer);
      map.on("mouseleave", "zones-fill", resetPointer);
      map.on("mouseenter", "shelters-points", setPointer);
      map.on("mouseleave", "shelters-points", resetPointer);
      map.on("mouseenter", "roads-lines", setPointer);
      map.on("mouseleave", "roads-lines", resetPointer);

      setMapLoaded(true);
    });

      mapRef.current = map;
      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn("Failed to initialize MapLibre GL:", err);
      setWebGLError(true);
    }
  }, [onSelectZone]);

  // Sync initialModel if changed externally
  useEffect(() => {
    if (initialModel) {
      setSelectedModel(initialModel);
    }
  }, [initialModel]);

  // Sync whatifGeojsonUrl when changed externally
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !whatifGeojsonUrl) return;
    const map = mapRef.current;
    const source = map.getSource("whatif-polygons") as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(whatifGeojsonUrl);
    }
  }, [whatifGeojsonUrl, mapLoaded]);

  // Sync timelineGeojsonUrl with unet-polygons
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || timelineGeojsonUrl === undefined) return;
    const map = mapRef.current;
    const source = map.getSource("unet-polygons") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    if (timelineGeojsonUrl === null) {
      source.setData(EMPTY_GEOJSON);
    } else {
      source.setData(timelineGeojsonUrl);
    }
  }, [timelineGeojsonUrl, mapLoaded]);

  // Filter cut-off rings when robustCutoffsOnly toggles
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("zones-cutoff-ring")) {
      if (robustCutoffsOnly) {
        map.setFilter("zones-cutoff-ring", [
          "all",
          ["==", ["get", "isolated"], true],
          ["!=", ["get", "touches_window_edge"], true],
          ["!=", ["get", "is_on_boundary_edge"], true],
        ]);
      } else {
        map.setFilter("zones-cutoff-ring", ["==", ["get", "isolated"], true]);
      }
    }
  }, [robustCutoffsOnly, mapLoaded]);

  // Update layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    const tierAVis = layerVisible && selectedModel === "tier_a" ? "visible" : "none";
    const unetVis = layerVisible && selectedModel === "unet" ? "visible" : "none";
    const whatifVis = layerVisible && selectedModel === "whatif" ? "visible" : "none";

    if (map.getLayer("tier-a-fill")) {
      map.setLayoutProperty("tier-a-fill", "visibility", tierAVis);
      map.setLayoutProperty("tier-a-outline", "visibility", tierAVis);
      map.setPaintProperty("tier-a-fill", "fill-opacity", opacity);
    }

    if (map.getLayer("unet-fill")) {
      map.setLayoutProperty("unet-fill", "visibility", unetVis);
      map.setLayoutProperty("unet-outline", "visibility", unetVis);
      const fillColor = showConfidence ? "#06B6D4" : "#10B981";
      map.setPaintProperty("unet-fill", "fill-color", fillColor);
      map.setPaintProperty("unet-fill", "fill-opacity", showConfidence ? opacity * 0.9 : opacity);
    }

    if (map.getLayer("whatif-fill")) {
      map.setLayoutProperty("whatif-fill", "visibility", whatifVis);
      map.setLayoutProperty("whatif-outline", "visibility", whatifVis);
      map.setPaintProperty("whatif-fill", "fill-opacity", opacity);
    }

    const zonesVis = showZones ? "visible" : "none";
    if (map.getLayer("zones-fill")) {
      map.setLayoutProperty("zones-fill", "visibility", zonesVis);
      map.setLayoutProperty("zones-outline", "visibility", zonesVis);
      map.setLayoutProperty("zones-cutoff-ring", "visibility", zonesVis);
    }

    const roadsVis = showRoads ? "visible" : "none";
    if (map.getLayer("roads-lines")) {
      map.setLayoutProperty("roads-lines", "visibility", roadsVis);
    }

    const sheltersVis = showShelters ? "visible" : "none";
    if (map.getLayer("shelters-points")) {
      map.setLayoutProperty("shelters-points", "visibility", sheltersVis);
    }

    const beaconsVis = showBeacons ? "visible" : "none";
    if (map.getLayer("beacon-clusters")) {
      map.setLayoutProperty("beacon-clusters", "visibility", beaconsVis);
      map.setLayoutProperty("beacon-cluster-count", "visibility", beaconsVis);
      map.setLayoutProperty("beacon-unclustered-pulse", "visibility", beaconsVis);
      map.setLayoutProperty("beacon-unclustered-point", "visibility", beaconsVis);
    }
  }, [selectedModel, showConfidence, layerVisible, showZones, showRoads, showShelters, showBeacons, opacity, mapLoaded]);

  return (
    <div className="relative w-full h-[650px] rounded-2xl overflow-hidden border border-white/10 bg-space-950 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full" />

      {webGLError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-space-950/95 text-center">
          <div className="max-w-md p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md space-y-3">
            <h3 className="text-base font-semibold text-white">Interactive Map (WebGL)</h3>
            <p className="text-xs text-slate-400">
              MapLibre hardware-accelerated canvas requires WebGL. All flood intelligence data, KPIs, settlement zones, and evacuation routes are accessible via the Table View.
            </p>
            <div className="text-[11px] font-mono text-cyan-400">
              Press &quot;Table View&quot; button above for comprehensive data inspection.
            </div>
          </div>
        </div>
      )}

      {/* Floating Header Card (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-md">
        <GlassCard className="p-4 space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-aurora-400 animate-pulse" />
              <h3 className="font-heading font-semibold text-white text-sm">
                Cachar Flood Extent & Impact
              </h3>
            </div>
            <div className="flex gap-1">
              <Badge variant="real">Sentinel-1</Badge>
              <Badge variant="derived">
                {selectedModel === "unet"
                  ? "U-Net ResNet34"
                  : selectedModel === "tier_a"
                  ? "Tier A"
                  : "HAND What-If"}
              </Badge>
            </div>
          </div>

          {/* Model Toggle Buttons */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-space-950/80 rounded-lg border border-white/10 text-xs font-mono">
            <button
              onClick={() => setSelectedModel("unet")}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md transition-all cursor-pointer text-[11px] ${
                selectedModel === "unet"
                  ? "bg-aurora-500/20 text-aurora-300 font-bold border border-aurora-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>U-Net</span>
            </button>
            <button
              onClick={() => setSelectedModel("tier_a")}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md transition-all cursor-pointer text-[11px] ${
                selectedModel === "tier_a"
                  ? "bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>Tier A</span>
            </button>
            <button
              onClick={() => setSelectedModel("whatif")}
              className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md transition-all cursor-pointer text-[11px] ${
                selectedModel === "whatif"
                  ? "bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
              <span>What-If</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
            <div>
              <span className="text-slate-400 block">Flooded Area</span>
              <span
                className={`font-bold text-sm ${
                  selectedModel === "unet"
                    ? "text-aurora-400"
                    : selectedModel === "tier_a"
                    ? "text-blue-400"
                    : "text-purple-400"
                }`}
              >
                {selectedModel === "unet"
                  ? "99.76 km²"
                  : selectedModel === "tier_a"
                  ? "126.17 km²"
                  : whatifAreaHa
                  ? `${(whatifAreaHa / 100.0).toFixed(2)} km²`
                  : "193.27 km²"}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {selectedModel === "unet"
                  ? "(9,976 ha in UTM-46N)"
                  : selectedModel === "tier_a"
                  ? "(12,617 ha in UTM-46N)"
                  : whatifAreaHa
                  ? `(${whatifAreaHa.toLocaleString()} ha in UTM-46N)`
                  : "(19,327 ha in UTM-46N)"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Layer Mode</span>
              <span className="text-white font-bold text-sm">
                {selectedModel === "unet"
                  ? "Observed SAR"
                  : selectedModel === "tier_a"
                  ? "Otsu Baseline"
                  : "HAND Scenario"}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {selectedModel === "whatif" ? "Hydrological Stage" : "(> 0.5 ha filter)"}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Selected Feature Inspector */}
        {selectedFeature && (
          <GlassCard className="p-3 bg-space-900/95 border-aurora-400/40 text-xs space-y-1.5 backdrop-blur-md max-w-sm">
            <div className="flex justify-between items-center">
              <span className="font-mono text-aurora-400 font-semibold truncate">
                {selectedFeature.title}
              </span>
              {selectedFeature.type === "zone" && (
                <Badge variant={selectedFeature.properties.isolated ? "simulated" : "real"}>
                  {selectedFeature.properties.isolated ? "CUT OFF" : "CONNECTED"}
                </Badge>
              )}
            </div>

            {selectedFeature.type === "zone" && (
              <div className="space-y-1 font-mono text-[11px] pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Priority Score:</span>
                  <span className="text-amber-400 font-bold">{selectedFeature.properties.priority_score} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Population (Exposed):</span>
                  <span className="text-white font-bold">
                    {selectedFeature.properties.population_exposed} / {selectedFeature.properties.population}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Flooded Area:</span>
                  <span className="text-white font-bold">
                    {selectedFeature.properties.flooded_area_ha} ha ({(parseFloat(String(selectedFeature.properties.flooded_fraction || 0)) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Roads Cut:</span>
                  <span className="text-red-400 font-bold">{selectedFeature.properties.roads_cut_km} km</span>
                </div>
                {selectedFeature.properties.safe_shelter_distance_km && (
                  <div className="flex justify-between pt-0.5 border-t border-white/10 text-[10px]">
                    <span className="text-slate-400">Nearest Safe Shelter:</span>
                    <span className="text-safe-400">{selectedFeature.properties.safe_shelter_distance_km} km</span>
                  </div>
                )}
              </div>
            )}

            {selectedFeature.type === "shelter" && (
              <div className="space-y-1 font-mono text-[11px] pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="text-white">{selectedFeature.properties.facility_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={selectedFeature.properties.is_safe ? "text-safe-400 font-bold" : "text-red-400 font-bold"}>
                    {selectedFeature.properties.status}
                  </span>
                </div>
              </div>
            )}

            {selectedFeature.type === "road" && (
              <div className="space-y-1 font-mono text-[11px] pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Highway Class:</span>
                  <span className="text-white capitalize">{selectedFeature.properties.highway}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Segment Status:</span>
                  <span className={selectedFeature.properties.is_cut ? "text-red-400 font-bold" : "text-safe-400"}>
                    {selectedFeature.properties.is_cut ? "FLOOD CUT (Inundated)" : "DRY (Passable)"}
                  </span>
                </div>
              </div>
            )}

            {selectedFeature.type === "beacon" && (
              <div className="space-y-1 font-mono text-[11px] pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Need:</span>
                  <span className="text-rose-400 font-bold capitalize">
                    {String(selectedFeature.properties.need_type || "Emergency")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Group Count:</span>
                  <span className="text-white font-bold">
                    {String(selectedFeature.properties.group_size || 1)} persons
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-cyan-400 font-bold capitalize">
                    {String(selectedFeature.properties.status || "new").replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Team:</span>
                  <span className="text-white truncate max-w-[150px]">
                    {String(selectedFeature.properties.assigned_team || "Unassigned")}
                  </span>
                </div>
                {selectedFeature.properties.note ? (
                  <div className="pt-1 text-[10px] text-slate-300 italic border-t border-white/10">
                    &ldquo;{String(selectedFeature.properties.note)}&rdquo;
                  </div>
                ) : null}
              </div>
            )}
          </GlassCard>
        )}
      </div>

      {/* Floating Layer Controls (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2">
        <GlassCard className="p-3 flex items-center gap-2 backdrop-blur-md text-xs font-mono">
          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2 py-1 rounded border transition-all cursor-pointer ${
              showZones ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-white/5 text-slate-400 border-white/10"
            }`}
          >
            Zones
          </button>
          <button
            onClick={() => setShowRoads(!showRoads)}
            className={`px-2 py-1 rounded border transition-all cursor-pointer ${
              showRoads ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-white/5 text-slate-400 border-white/10"
            }`}
          >
            Roads
          </button>
          <button
            onClick={() => setShowShelters(!showShelters)}
            className={`px-2 py-1 rounded border transition-all cursor-pointer ${
              showShelters ? "bg-safe-500/20 text-safe-300 border-safe-500/30" : "bg-white/5 text-slate-400 border-white/10"
            }`}
          >
            Shelters
          </button>
          <button
            onClick={() => setShowConfidence(!showConfidence)}
            className={`px-2 py-1 rounded border transition-all cursor-pointer ${
              showConfidence ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-white/5 text-slate-400 border-white/10"
            }`}
          >
            Confidence
          </button>
          <button
            onClick={() => setOpacity((prev) => (prev >= 0.85 ? 0.35 : prev + 0.25))}
            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            Opacity {Math.round(opacity * 100)}%
          </button>
          <button
            onClick={() => setLayerVisible(!layerVisible)}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
          >
            {layerVisible ? <Eye className="w-3.5 h-3.5 text-aurora-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>Flood Mask</span>
          </button>
        </GlassCard>
      </div>

      {/* Provenance Footer Indicator (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="px-3 py-1 rounded-full bg-space-950/80 border border-white/10 text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <Badge variant="derived" className="text-[10px] py-0 px-2">DERIVED</Badge>
          <span>Settlement zones: Voronoi of OSM villages clipped to Cachar window</span>
        </div>
      </div>
    </div>
  );
}
