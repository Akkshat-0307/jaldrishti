"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import type { ImpactSummary, RiverOutlook } from "../types";
import {
  AlertTriangle,
  Info,
  Route,
  Trees,
  Users,
  Waves,
} from "lucide-react";

interface ImpactTabProps {
  summary?: ImpactSummary | null;
  riverOutlook?: RiverOutlook | null;
}

export function ImpactTab({ summary, riverOutlook }: ImpactTabProps) {
  const exposedPop = summary?.total_population_exposed ?? 101986;
  const cutoffPop = summary?.isolated_population ?? 100310;
  const cutoffExposedPop = summary?.total_cutoff_zones_exposed_population ?? 38481;
  const croplandHa = summary?.total_cropland_flooded_or_waterlogged_ha ?? 8169.66;
  const builtupHa = summary?.total_built_up_flooded_ha ?? 9.0;
  const roadsCutKm = summary?.total_roads_potentially_cut_km ?? 196.35;

  const currentDischarge = riverOutlook?.current_discharge_m3s ?? 499.0;
  const peakDischarge = riverOutlook?.peak_forecast_discharge_m3s ?? 503.7;
  const fetchTime = riverOutlook?.fetch_timestamp
    ? new Date(riverOutlook.fetch_timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recent";

  return (
    <div className="space-y-4 p-4 text-xs text-white" aria-label="Regional Flood Impact Assessment">
      {/* 1. River Outlook Card (ECMWF GloFAS via Open-Meteo) */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Waves className="h-4 w-4 text-cyan-400" />
            <span>Barak River Outlook</span>
          </div>
          <Badge variant="modelled" size="sm">MODELLED (GloFAS)</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-white/5 p-2 rounded-lg font-mono">
          <div>
            <div className="text-[10px] text-white/50">Current Discharge</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">
              {currentDischarge.toFixed(1)} <span className="text-[10px] text-white/50">m³/s</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/50">7-Day Peak</div>
            <div className="text-base font-bold text-white mt-0.5">
              {peakDischarge.toFixed(1)} <span className="text-[10px] text-white/50">m³/s</span>
            </div>
          </div>
        </div>

        {/* Visual Tagging & Provenance */}
        <div className="flex flex-col gap-1 text-[11px] text-white/60 pt-1 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-white/40">Station:</span>
            <span className="font-medium text-white/80">Silchar / Cachar (nearest GloFAS river cell)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/40">Scope:</span>
            <span className="text-amber-300/90 font-medium">current outlook (not the 2022 event)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/40">Updated:</span>
            <span className="font-mono text-white/50">{fetchTime}</span>
          </div>
        </div>
      </div>

      {/* 2. Population Breakdown */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Users className="h-4 w-4 text-amber-400" />
            <span>Population Impact (Modelled Estimate)</span>
          </div>
          <Badge variant="derived" size="sm">DERIVED</Badge>
        </div>

        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-white/70">Population inside flood mask (exposed):</span>
            <span className="font-mono font-bold text-amber-300">{exposedPop.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-white/5">
            <span className="text-white/70">Total population of cut-off zones:</span>
            <span className="font-mono font-bold text-orange-400">{cutoffPop.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-white/50">Exposed residents within cut-off zones:</span>
            <span className="font-mono text-white/80">{cutoffExposedPop.toLocaleString()}</span>
          </div>
        </div>

        <div className="text-[10px] text-white/50 bg-white/5 p-2 rounded leading-relaxed">
          <Info className="h-3 w-3 inline text-cyan-400 mr-1" />
          Modelled estimates derived from WorldPop 2020 (100m UN-adjusted raster). Exposed population represents residents whose cells intersect detected floodwater. Cut-off population encompasses residents residing in hydraulically severed zones who cannot access emergency shelters by road.
        </div>
      </div>

      {/* 3. Agriculture & Infrastructure */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Trees className="h-4 w-4 text-emerald-400" />
            <span>Agriculture & Infrastructure</span>
          </div>
          <Badge variant="derived" size="sm">DERIVED</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 p-2 rounded-lg">
            <div className="text-[10px] text-white/50">Cropland flooded or waterlogged</div>
            <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
              {croplandHa.toLocaleString()} ha
            </div>
            <div className="text-[9px] text-white/40 mt-0.5">
              ESA WorldCover class 40
            </div>
          </div>

          <div className="bg-white/5 p-2 rounded-lg">
            <div className="text-[10px] text-white/50">Built-Up Flooded</div>
            <div className="text-sm font-bold text-red-300 font-mono mt-0.5">
              {builtupHa.toFixed(1)} ha
            </div>
            <div className="text-[9px] text-white/40 mt-0.5">
              ESA WorldCover class 50
            </div>
          </div>
        </div>

        <div className="bg-white/5 p-2 rounded-lg flex items-center justify-between font-mono">
          <span className="text-white/60 font-sans text-xs flex items-center gap-1.5">
            <Route className="h-3.5 w-3.5 text-purple-400" />
            Roads Potentially Cut
          </span>
          <span className="font-bold text-purple-300 text-sm">
            {roadsCutKm.toFixed(1)} km
          </span>
        </div>

        <div className="text-[10px] text-white/40 bg-amber-950/20 border border-amber-800/30 p-2 rounded leading-relaxed">
          <AlertTriangle className="h-3 w-3 inline text-amber-400 mr-1" />
          <span className="font-semibold text-amber-300">Methodological Limitation:</span> Cropland flooded or waterlogged includes rice paddies and low-lying agricultural fields whose radar backscatter naturally overlaps with water. Road cuts apply a 50m buffer; elevated bridges are not modelled.
        </div>
      </div>
    </div>
  );
}
