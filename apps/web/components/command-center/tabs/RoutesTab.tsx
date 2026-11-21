"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { RouteItem, ZoneFeature } from "../types";
import {
  AlertTriangle,
  Anchor,
  CornerDownRight,
  Info,
  Navigation,
  Shield,
} from "lucide-react";

interface RoutesTabProps {
  villages?: ZoneFeature[];
  selectedZoneId?: string | null;
  onSelectZone: (zoneId: string) => void;
  routeData?: RouteItem | null;
}

export function RoutesTab({
  villages = [],
  selectedZoneId,
  onSelectZone,
  routeData,
}: RoutesTabProps) {
  return (
    <div className="space-y-4 p-4 text-xs text-white" aria-label="Evacuation Routing and Staging Engine">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Navigation className="h-4 w-4 text-emerald-400" />
          <span>Evacuation Routing Engine</span>
        </div>
        <Badge variant="derived" size="sm">DERIVED</Badge>
      </div>

      {/* Origin Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] text-white/60">Select Origin Settlement Zone:</label>
        <select
          value={selectedZoneId ?? ""}
          onChange={(e) => onSelectZone(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
        >
          <option value="" disabled className="bg-slate-900 text-white">
            Choose a settlement zone...
          </option>
          {villages.map((v) => (
            <option key={v.properties.zone_id} value={v.properties.zone_id} className="bg-slate-900 text-white">
              {v.properties.name} (#{v.properties.zone_id}) — {v.properties.isolated ? "Cut Off" : "Connected"}
            </option>
          ))}
        </select>
      </div>

      {/* Route Details Card */}
      {routeData && (
        <div className="space-y-3">
          {routeData.has_route ? (
            /* Connected Zone - Primary & Alternate Routes */
            <div className="space-y-3">
              {/* Primary Route */}
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" />
                    Primary Evacuation Corridor
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {routeData.eta_minutes} min ETA
                  </span>
                </div>

                <div className="text-white font-medium text-xs">
                  Dest: {routeData.destination_shelter?.name}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/5 p-2 rounded-lg">
                  <div>
                    <span className="text-white/40 block text-[9px]">DISTANCE</span>
                    <span className="text-white font-bold">{routeData.distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[9px]">TRAVEL TIME</span>
                    <span className="text-white font-bold">{routeData.eta_minutes} min</span>
                  </div>
                </div>
              </div>

              {/* Alternate Route */}
              <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                    <CornerDownRight className="h-3.5 w-3.5 text-cyan-400" />
                    Alternate Route Corridor
                  </span>
                  {routeData.has_alternate ? (
                    <span className="font-mono text-cyan-300 font-bold">
                      {routeData.alternate_eta_minutes} min ETA
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400">No Distinct Alt</span>
                  )}
                </div>

                {routeData.has_alternate ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/5 p-2 rounded-lg">
                    <div>
                      <span className="text-white/40 block text-[9px]">ALT DISTANCE</span>
                      <span className="text-white font-bold">{routeData.alternate_distance_km} km</span>
                    </div>
                    <div>
                      <span className="text-white/40 block text-[9px]">ALT TRAVEL TIME</span>
                      <span className="text-white font-bold">{routeData.alternate_eta_minutes} min</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-800/30 rounded p-2">
                    {routeData.alternate_message ?? "No distinct alternate route (shares >80% length with primary corridor)."}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Cut-off Zone - Staging Vector */
            <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  No Passable Road Connection
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                  CUT OFF
                </span>
              </div>

              <p className="text-[11px] text-white/70 leading-relaxed">
                All drivable access routes from {routeData.origin.label} are severed by 50m flood safety buffers.
              </p>

              {routeData.staging_hint?.available && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <Anchor className="h-3.5 w-3.5" />
                      Boat / Air Egress Vector
                    </span>
                    <span className="text-white font-bold">
                      {routeData.staging_hint.straight_line_distance_km} km
                    </span>
                  </div>

                  <p className="text-[10px] text-white/60 leading-relaxed">
                    Shortest straight-line transfer to passable highway network landing point:
                  </p>

                  <div className="text-[9px] font-mono text-cyan-300 bg-black/40 p-1.5 rounded">
                    Safe Landing: [{routeData.staging_hint.safe_network_entry_coordinates?.[0].toFixed(4)},{" "}
                    {routeData.staging_hint.safe_network_entry_coordinates?.[1].toFixed(4)}]
                  </div>

                  <div className="text-[10px] text-amber-300/90 font-medium pt-1">
                    * {routeData.staging_hint.disclaimer}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Routing Assumptions */}
          <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 text-[10px] text-white/50 space-y-1">
            <div className="font-semibold text-white/70 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Engine Assumptions
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>50m flood safety buffer applied to road severing (bridges unmodelled).</li>
              <li>Speeds: Trunk 60 km/h, Primary 50 km/h, Secondary 40 km/h, Tertiary 30 km/h, Residential 20 km/h.</li>
              <li>50% speed degradation and 1.5x impedance penalty within 200m flood proximity.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
