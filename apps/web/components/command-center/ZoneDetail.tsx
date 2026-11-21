"use client";

import React from "react";
import type { RouteItem, ZoneProperties } from "./types";
import {
  AlertTriangle,
  Droplets,
  MapPin,
  MapPinOff,
  Navigation,
  Shield,
  Users,
  X,
} from "lucide-react";

interface ZoneDetailProps {
  zone: ZoneProperties;
  route?: RouteItem | null;
  onClose: () => void;
  onSelectRoute?: () => void;
}

export function ZoneDetail({ zone, route, onClose, onSelectRoute }: ZoneDetailProps) {
  const isCutoff = zone.isolated;
  const priority = zone.priority_score;

  return (
    <div
      id="zone-detail-card"
      aria-label={`Settlement zone details for ${zone.name}`}
      className="bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-xl p-3.5 shadow-2xl text-xs space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-sm">{zone.name}</h3>
            <span className="text-[11px] font-mono text-white/50">#{zone.zone_id}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-white/60">{zone.block}</span>
            <span className="text-white/30">•</span>
            <span className="text-[11px] text-white/60 capitalize">{zone.place_type}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          title="Close zone details"
          aria-label="Close zone details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
            isCutoff
              ? "bg-red-500/20 border border-red-500/40 text-red-300"
              : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
          }`}
        >
          {isCutoff ? <MapPinOff className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
          {isCutoff ? "CUT OFF (SEVERED)" : "ROAD CONNECTED"}
        </span>

        <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[11px] font-mono font-bold">
          Rank #{zone.rank} • Score {priority.toFixed(1)}
        </span>

        {zone.touches_window_edge && (
          <span
            className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px]"
            title="Touches Cachar study bbox perimeter. Road truncation at boundary may overstate cut-off severity."
          >
            Touches Window Edge
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
        {/* Population */}
        <div className="bg-white/5 rounded-lg p-2">
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <Users className="h-3 w-3 text-cyan-400" />
            <span>Population</span>
          </div>
          <div className="text-sm font-bold text-white font-mono mt-0.5">
            {zone.population.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-300 font-mono">
            {zone.population_exposed.toLocaleString()} exposed
          </div>
        </div>

        {/* Flood Extent */}
        <div className="bg-white/5 rounded-lg p-2">
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <Droplets className="h-3 w-3 text-blue-400" />
            <span>Flooded Area</span>
          </div>
          <div className="text-sm font-bold text-white font-mono mt-0.5">
            {zone.flooded_area_ha.toFixed(1)} ha
          </div>
          <div className="text-[10px] text-white/50">
            {(zone.flooded_fraction * 100).toFixed(1)}% of zone
          </div>
        </div>

        {/* Cropland Waterlogged */}
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-white/50 text-[10px]">Cropland flooded or waterlogged</div>
          <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
            {zone.cropland_flooded_or_waterlogged_ha.toFixed(1)} ha
          </div>
          <div className="text-[9px] text-white/40">Includes paddies</div>
        </div>

        {/* Roads Cut */}
        <div className="bg-white/5 rounded-lg p-2">
          <div className="text-white/50 text-[10px]">Roads Cut</div>
          <div className="text-sm font-bold text-purple-300 font-mono mt-0.5">
            {zone.roads_potentially_cut_km.toFixed(1)} km
          </div>
          <div className="text-[9px] text-white/40">50m buffer</div>
        </div>
      </div>

      {/* Evacuation & Shelter Status */}
      <div className="bg-white/5 rounded-lg p-2.5 space-y-1.5 border border-white/5">
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span className="flex items-center gap-1 font-semibold text-white">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            Nearest Facility / Shelter
          </span>
          {zone.safe_shelter_distance_km && (
            <span className="font-mono text-emerald-300">
              {zone.safe_shelter_distance_km} km (dry)
            </span>
          )}
        </div>

        {route?.has_route ? (
          <div className="space-y-1">
            <div className="text-white text-[11px] font-medium">
              Dest: {route.destination_shelter?.name}
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3 text-[10px] text-white/60 font-mono">
                <span>Dist: {route.distance_km} km</span>
                <span>ETA: {route.eta_minutes} min</span>
              </div>
              {onSelectRoute && (
                <button
                  onClick={onSelectRoute}
                  className="text-[10px] text-cyan-300 hover:text-cyan-200 underline font-medium flex items-center gap-0.5"
                >
                  <Navigation className="h-3 w-3" />
                  Route Details
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-red-300 text-[11px] font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              No drivable road route available
            </div>
            {route?.staging_hint?.available && (
              <div className="text-[10px] text-white/70 bg-red-950/40 border border-red-800/30 rounded p-1.5 mt-1">
                <span className="font-semibold text-amber-300">Decision Support Suggestion:</span>{" "}
                Boat / Air staging required ({route.staging_hint.straight_line_distance_km} km transfer).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
