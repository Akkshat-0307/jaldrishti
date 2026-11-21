"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { ScenariosIndex } from "../types";
import {
  AlertTriangle,
  Info,
  Sliders,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface WhatIfTabProps {
  scenariosIndex?: ScenariosIndex | null;
  activeDelta: number;
  onSelectDelta: (delta: number) => void;
}

export function WhatIfTab({ scenariosIndex, activeDelta, onSelectDelta }: WhatIfTabProps) {
  const hStar = scenariosIndex?.h_star_baseline_m ?? 1.5;
  const scenarios = scenariosIndex?.scenarios ?? [];

  const currentScenario =
    scenarios.find((s) => Math.abs(s.delta_m - activeDelta) < 0.01) ??
    scenarios[2] ?? {
      delta_m: 0.0,
      delta_tag: "p00",
      effective_water_level_m: 1.5,
      flooded_area_ha: 10408.3,
      exposed_population: 128959,
      cropland_waterlogged_ha: 8400.0,
      roads_potentially_cut_km: 568.58,
      cutoff_zones_count: 18,
      cutoff_zones_robust_count: 9,
      isolated_population: 172000,
    };

  const observedRef = scenariosIndex?.observed_reference ?? {
    source: "U-Net ResNet34 Flood Segmentation (2022-06-18 Sentinel-1)",
    flooded_area_ha: 9976.0,
    exposed_population: 101986,
    cutoff_zones_count: 8,
  };

  const deltaArea = currentScenario.flooded_area_ha - observedRef.flooded_area_ha;
  const deltaPop = currentScenario.exposed_population - observedRef.exposed_population;
  const deltaCutoffs = currentScenario.cutoff_zones_count - observedRef.cutoff_zones_count;

  const deltaOptions = [-1.0, -0.5, 0.0, 0.5, 1.0, 2.0];

  return (
    <div className="space-y-4 p-4 text-xs text-white" aria-label="Hydrological What-If Scenarios">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Sliders className="h-4 w-4 text-indigo-400" />
          <span>HAND Water-Level What-If Model</span>
        </div>
        <Badge variant="simulated" size="sm">SIMULATED</Badge>
      </div>

      {/* Planning Aid Disclaimer Badge */}
      <div className="bg-amber-950/30 border border-amber-500/40 p-2.5 rounded-xl flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-amber-200/90 leading-relaxed">
          <strong>Planning Aid Disclaimer:</strong> Water-level scenarios are a planning aid, not a forecast. They model terrain ponding along drainage channels under hypothetical river stage anomalies.
        </div>
      </div>

      {/* Water Level Stage Selector */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/70">Stage Anomaly (Δh):</span>
          <span className="font-mono text-indigo-300 font-bold text-sm">
            {activeDelta >= 0 ? `+${activeDelta.toFixed(1)}` : activeDelta.toFixed(1)} m
          </span>
        </div>

        {/* Stepper Buttons */}
        <div className="grid grid-cols-6 gap-1">
          {deltaOptions.map((d) => {
            const isSelected = Math.abs(d - activeDelta) < 0.01;
            return (
              <button
                key={d}
                onClick={() => onSelectDelta(d)}
                className={`py-1.5 rounded text-[11px] font-mono font-bold transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                    : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                {d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1)}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/50 pt-1 border-t border-white/5">
          <span>Area-Matched Baseline:</span>
          <span className="font-mono text-white/80">h* = {hStar.toFixed(2)} m</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-white/50">
          <span>Effective Water Level:</span>
          <span className="font-mono text-cyan-300 font-bold">
            h = {currentScenario.effective_water_level_m.toFixed(2)} m
          </span>
        </div>
      </div>

      {/* Comparison against Observed U-Net Peak */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/80">
          <span>Scenario vs. Observed U-Net</span>
          <span className="text-white/40 font-mono">2022-06-18 Peak</span>
        </div>

        <div className="space-y-2">
          {/* Flooded Area */}
          <div className="bg-white/5 p-2 rounded-lg flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-white/40 block">FLOOD EXTENT</span>
              <span className="text-white font-bold">{currentScenario.flooded_area_ha.toFixed(1)} ha</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white/40 block">VS OBSERVED</span>
              <span
                className={`text-xs font-bold flex items-center gap-0.5 justify-end ${
                  deltaArea >= 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {deltaArea >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {deltaArea >= 0 ? `+${deltaArea.toFixed(1)}` : deltaArea.toFixed(1)} ha
              </span>
            </div>
          </div>

          {/* Exposed Population */}
          <div className="bg-white/5 p-2 rounded-lg flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-white/40 block">EXPOSED POPULATION</span>
              <span className="text-amber-300 font-bold">
                {currentScenario.exposed_population.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white/40 block">VS OBSERVED</span>
              <span
                className={`text-xs font-bold flex items-center gap-0.5 justify-end ${
                  deltaPop >= 0 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                {deltaPop >= 0 ? `+${deltaPop.toLocaleString()}` : deltaPop.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cut-off Settlements */}
          <div className="bg-white/5 p-2 rounded-lg flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-white/40 block">CUT-OFF SETTLEMENTS</span>
              <span className="text-red-300 font-bold">
                {currentScenario.cutoff_zones_count} / 20 zones
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-white/40 block">VS OBSERVED</span>
              <span
                className={`text-xs font-bold flex items-center gap-0.5 justify-end ${
                  deltaCutoffs >= 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {deltaCutoffs >= 0 ? `+${deltaCutoffs}` : deltaCutoffs} zones
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Architectural Rationale Note */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-[10px] text-white/50 space-y-1.5 leading-relaxed">
        <div className="font-semibold text-white/70 flex items-center gap-1">
          <Info className="h-3.5 w-3.5 text-cyan-400" />
          Why HAND instead of Rainfall Regression?
        </div>
        <p>
          NASA IMERG satellite precipitation exhibits near-zero spatial variation across this 20 km x 16 km study bounding box. Training a spatial machine-learning regressor on uniform rainfall to predict our own derived flood mask would be circular.
        </p>
        <p>
          The Height Above Nearest Drainage (HAND) model physically tracks inundation along hydrologically conditioned DEM drainage networks (MERIT-Hydro).
        </p>
      </div>
    </div>
  );
}
