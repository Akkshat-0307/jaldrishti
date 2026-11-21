"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { ImpactSummary } from "./types";
import { AlertTriangle, Droplets, MapPinOff, Route, Users } from "lucide-react";

interface KpiStripProps {
  summary?: ImpactSummary | null;
  robustCutoffsOnly: boolean;
  onToggleRobust: () => void;
}

export function KpiStrip({ summary, robustCutoffsOnly, onToggleRobust }: KpiStripProps) {
  const exposedPop = summary?.total_population_exposed ?? 101986;
  const floodedHa = 9976.0;
  const floodedKm2 = 99.76;
  const totalCutoffs = summary?.cutoff_zones_count ?? 8;
  const robustCutoffs = summary?.cutoff_zones_robust_count ?? 3;
  const edgeCutoffs = summary?.cutoff_zones_touching_edge_count ?? 5;
  const cutoffPop = summary?.isolated_population ?? 100310;
  const roadsCutKm = summary?.total_roads_potentially_cut_km ?? 196.35;

  return (
    <section
      id="kpi-strip"
      className="bg-black/40 border-b border-white/10 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0"
      aria-label="Key operational flood impact indicators"
    >
      {/* 1. Flooded Extent */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-white/60 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Droplets className="h-3.5 w-3.5 text-cyan-400" />
            Flood Extent
          </span>
          <Badge variant="derived" size="sm">DERIVED</Badge>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-white font-mono">
            {floodedHa.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <span className="text-xs text-white/50">ha</span>
          <span className="text-xs text-white/40 font-mono">({floodedKm2.toFixed(1)} km²)</span>
        </div>
        <div className="text-[11px] text-white/50 mt-1 truncate">
          U-Net ResNet34 + HAND/JRC
        </div>
      </div>

      {/* 2. Population Exposed */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-white/60 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Users className="h-3.5 w-3.5 text-amber-400" />
            Population Exposed
          </span>
          <Badge variant="derived" size="sm">DERIVED</Badge>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-amber-300 font-mono">
            {exposedPop.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">residents</span>
        </div>
        <div className="text-[11px] text-white/50 mt-1 truncate">
          WorldPop 100m within flood mask
        </div>
      </div>

      {/* 3. Cut-off Settlements */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-white/60 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPinOff className="h-3.5 w-3.5 text-red-400" />
            Cut-off Zones
          </span>
          <button
            onClick={onToggleRobust}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              robustCutoffsOnly
                ? "bg-red-500/30 text-red-200 border border-red-400/40"
                : "bg-white/10 text-white/60 hover:text-white"
            }`}
            title="Toggle between all cut-offs (8) and robust cut-offs (3, excluding edge truncation)"
          >
            {robustCutoffsOnly ? "Robust Only (3)" : "All (8)"}
          </button>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-red-300 font-mono">
            {robustCutoffsOnly ? robustCutoffs : totalCutoffs}
          </span>
          <span className="text-xs text-white/50">/ 20 zones</span>
        </div>
        <div className="text-[11px] text-white/50 mt-1 truncate">
          {robustCutoffs} robust, {edgeCutoffs} touch window edge
        </div>
      </div>

      {/* 4. Cut-off Zone Population */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-white/60 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
            Cut-off Population
          </span>
          <Badge variant="derived" size="sm">DERIVED</Badge>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-orange-300 font-mono">
            {cutoffPop.toLocaleString()}
          </span>
          <span className="text-xs text-white/50">in severed zones</span>
        </div>
        <div className="text-[11px] text-white/50 mt-1 truncate">
          38,481 inside flood; 100,310 total
        </div>
      </div>

      {/* 5. Roads Potentially Cut */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col justify-between col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-xs text-white/60 mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Route className="h-3.5 w-3.5 text-purple-400" />
            Roads Severed
          </span>
          <Badge variant="derived" size="sm">DERIVED</Badge>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold tracking-tight text-purple-300 font-mono">
            {roadsCutKm.toFixed(1)}
          </span>
          <span className="text-xs text-white/50">km cut</span>
        </div>
        <div className="text-[11px] text-white/50 mt-1 truncate">
          50m buffer; elevated roads unmodelled
        </div>
      </div>
    </section>
  );
}
