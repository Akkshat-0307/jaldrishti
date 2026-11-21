"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { Eye, EyeOff } from "lucide-react";

interface FloodMapProps {
  geojsonUrl?: string;
}

// Free dark basemap style with fallback
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

export default function FloodMap({
  geojsonUrl = "/data/events/assam-2022/flood_polygons.geojson",
}: FloodMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [layerVisible, setLayerVisible] = useState(true);
  const [opacity, setOpacity] = useState(0.7);
  const [selectedPolygon, setSelectedPolygon] = useState<{
    id: string | number;
    area_ha: number;
    area_km2: number;
    layer: string;
  } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center on Silchar, Cachar district, Assam (Lon: 92.80, Lat: 24.83)
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
      // Add flood polygons GeoJSON source
      map.addSource("assam-flood-polygons", {
        type: "geojson",
        data: geojsonUrl,
      });

      // Fill layer
      map.addLayer({
        id: "flood-fill",
        type: "fill",
        source: "assam-flood-polygons",
        paint: {
          "fill-color": "#3B82F6",
          "fill-opacity": 0.7,
        },
      });

      // Outline stroke layer
      map.addLayer({
        id: "flood-outline",
        type: "line",
        source: "assam-flood-polygons",
        paint: {
          "line-color": "#22D3EE",
          "line-width": 1.2,
          "line-opacity": 0.85,
        },
      });

      // Click interaction
      map.on("click", "flood-fill", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties || {};

        setSelectedPolygon({
          id: props.polygon_id || feature.id || "Unknown",
          area_ha: parseFloat(props.area_ha || "0"),
          area_km2: parseFloat(props.area_km2 || "0"),
          layer: props.layer || "DERIVED",
        });
      });

      // Cursor change
      map.on("mouseenter", "flood-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "flood-fill", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [geojsonUrl]);

  // Update visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const visibility = layerVisible ? "visible" : "none";
    if (mapRef.current.getLayer("flood-fill")) {
      mapRef.current.setLayoutProperty("flood-fill", "visibility", visibility);
    }
    if (mapRef.current.getLayer("flood-outline")) {
      mapRef.current.setLayoutProperty("flood-outline", "visibility", visibility);
    }
  }, [layerVisible, mapLoaded]);

  // Update opacity
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (mapRef.current.getLayer("flood-fill")) {
      mapRef.current.setPaintProperty("flood-fill", "fill-opacity", opacity);
    }
  }, [opacity, mapLoaded]);

  return (
    <div className="relative w-full h-[650px] rounded-2xl overflow-hidden border border-white/10 bg-space-950 shadow-2xl">
      {/* MapLibre DOM element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Header Card */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-md">
        <GlassCard className="p-4 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-aurora-400 animate-pulse" />
              <h3 className="font-heading font-semibold text-white text-sm">
                Cachar / Silchar Flood Extent
              </h3>
            </div>
            <div className="flex gap-1">
              <Badge variant="real">S1 SAR</Badge>
              <Badge variant="derived">Tier A Baseline</Badge>
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Acquisition: Sentinel-1 IW GRD (2022-06-18) vs Baseline (2022-05-01).
            Processed with median speckle filter, change thresholding, Otsu, and HAND terrain gating.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs font-mono">
            <div>
              <span className="text-slate-400 block">Flooded Area</span>
              <span className="text-aurora-400 font-bold text-sm">126.17 km²</span>
              <span className="text-[10px] text-slate-500 block">(12,617 ha in UTM-46N)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Detected Blobs</span>
              <span className="text-white font-bold text-sm">680 Polygons</span>
              <span className="text-[10px] text-slate-500 block">(&gt; 0.5 ha filter)</span>
            </div>
          </div>
        </GlassCard>

        {/* Selected Polygon Inspector */}
        {selectedPolygon && (
          <GlassCard className="p-3 bg-space-900/90 border-aurora-400/40 text-xs space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-mono text-aurora-400 font-semibold">
                Polygon #{selectedPolygon.id}
              </span>
              <Badge variant="derived">{selectedPolygon.layer}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              <div>
                <span className="text-slate-400">Area: </span>
                <span className="text-white font-bold">{selectedPolygon.area_ha.toFixed(2)} ha</span>
              </div>
              <div>
                <span className="text-slate-400">Extent: </span>
                <span className="text-white font-bold">{selectedPolygon.area_km2.toFixed(3)} km²</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 pt-1">
              Area calculated in projected UTM Zone 46N (EPSG:32646).
            </p>
          </GlassCard>
        )}
      </div>

      {/* Floating Layer Controls (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-10">
        <GlassCard className="p-3 flex items-center gap-3 backdrop-blur-md">
          <button
            onClick={() => setLayerVisible(!layerVisible)}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-200 hover:text-white cursor-pointer px-2 py-1 rounded bg-white/5 border border-white/10"
          >
            {layerVisible ? <Eye className="w-3.5 h-3.5 text-aurora-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span>Flood Mask</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20 accent-aurora-400 cursor-pointer"
            />
            <span className="w-8 text-right text-slate-200 font-mono">
              {Math.round(opacity * 100)}%
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Provenance Footer Indicator (Bottom Center) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="px-3 py-1 rounded-full bg-space-950/80 border border-white/10 text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <Badge variant="derived" className="text-[10px] py-0 px-2">DERIVED</Badge>
          <span>Areas computed strictly in UTM Zone 46N (EPSG:32646)</span>
        </div>
      </div>
    </div>
  );
}
