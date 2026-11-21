"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";

export function MapLegend({ basemapError = false }: { basemapError?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute bottom-3 left-3 z-20 font-mono text-[11px]">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white shadow-lg transition-colors cursor-pointer"
          aria-expanded={false}
          aria-label="Expand Map Legend"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <div className="flex items-center -space-x-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 border border-slate-900 inline-block" />
            <span className="w-2 h-2 rounded-full bg-red-500 border border-slate-900 inline-block" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 border border-slate-900 inline-block" />
          </div>
          <span>Legend</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      ) : (
        <div className="w-72 max-h-[460px] overflow-y-auto rounded-xl bg-slate-950/95 backdrop-blur-md border border-white/15 p-3 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Map Legend & Provenance</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Collapse Map Legend"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Inundation Extent */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inundation Layers</div>
            <div className="flex items-center justify-between text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-500/60 border border-blue-400 inline-block" />
                <span>U-Net SAR Inundation</span>
              </div>
              <Badge variant="derived" className="text-[9px] py-0 px-1">DERIVED</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-sky-400/50 border border-sky-300 inline-block" />
                <span>Otsu Baseline (Tier A)</span>
              </div>
              <Badge variant="derived" className="text-[9px] py-0 px-1">DERIVED</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-purple-500/50 border border-purple-400 inline-block" />
                <span>What-If HAND Scenario</span>
              </div>
              <Badge variant="simulated" className="text-[9px] py-0 px-1">SIMULATED</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-cyan-400/50 border border-cyan-300 inline-block" />
                <span>U-Net Confidence &gt; 0.8</span>
              </div>
              <Badge variant="derived" className="text-[9px] py-0 px-1">DERIVED</Badge>
            </div>
          </div>

          {/* Settlement Zones */}
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settlement Zones</div>
            <div className="flex items-center justify-between text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 border-red-500 border-dashed inline-block animate-pulse" />
                <span>Cut-Off Zone (Isolated)</span>
              </div>
              <Badge variant="derived" className="text-[9px] py-0 px-1">DERIVED</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-amber-500 inline-block" />
                <span>Connected Zone (No Fill)</span>
              </div>
              <Badge variant="derived" className="text-[9px] py-0 px-1">DERIVED</Badge>
            </div>
          </div>

          {/* Roads & Transport */}
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transport & Evacuation</div>
            <div className="flex items-center justify-between text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-red-500 inline-block" />
                <span>Potentially Cut Road</span>
              </div>
              <Badge variant="derived" className="text-[9px] py-0 px-1">DERIVED</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-500 inline-block" />
                <span>Passable Road Network</span>
              </div>
              <Badge variant="real" className="text-[9px] py-0 px-1">REAL</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                <span>Primary Evacuation Route</span>
              </div>
              <Badge variant="derived" className="text-[9px] py-0 px-1">DERIVED</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-amber-400 border-dashed inline-block" />
                <span>Alternate Route</span>
              </div>
              <Badge variant="derived" className="text-[9px] py-0 px-1">DERIVED</Badge>
            </div>
          </div>

          {/* Shelters & Beacons */}
          <div className="space-y-1.5 pt-1 border-t border-white/5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shelters & Beacons</div>
            <div className="flex items-center justify-between text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white inline-block" />
                <span>Safe Shelter Facility</span>
              </div>
              <Badge variant="real" className="text-[9px] py-0 px-1">REAL</Badge>
            </div>
            <div className="flex items-center justify-between text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white inline-block" />
                <span>Rescue Beacon (SOS)</span>
              </div>
              <Badge variant="simulated" className="text-[9px] py-0 px-1">SIMULATED</Badge>
            </div>
          </div>

          {/* Basemap & Provenance Footnote */}
          <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Protomaps / OSM Vector Basemap</span>
              <Badge variant="real" className="text-[9px] py-0 px-1">REAL</Badge>
            </div>
            {basemapError && (
              <p className="text-[9px] text-amber-300 font-bold">
                Basemap offline fallback active
              </p>
            )}
            <p className="text-[9.5px] text-slate-400 leading-tight">
              Voronoi zones clipped to Cachar window [92.60, 24.65, 93.00, 25.00]. Roads leaving the window are truncated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
