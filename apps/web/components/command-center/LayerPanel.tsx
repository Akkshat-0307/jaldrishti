"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { LayerState } from "./types";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

interface LayerPanelProps {
  layers: LayerState;
  onChangeLayers: (updated: Partial<LayerState>) => void;
}

export function LayerPanel({ layers, onChangeLayers }: LayerPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      id="layer-panel"
      aria-label="Map layer control panel"
      className={`absolute left-3 top-3 z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-10" : "w-72"
      }`}
    >
      <div className="bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            {!isCollapsed && (
              <span className="text-xs font-semibold text-white tracking-wide uppercase">
                Map Layers
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title={isCollapsed ? "Expand Layer Panel" : "Collapse Layer Panel"}
            aria-label={isCollapsed ? "Expand layer panel" : "Collapse layer panel"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Content */}
        {!isCollapsed && (
          <div className="p-3 space-y-3.5 max-h-[calc(100vh-220px)] overflow-y-auto text-xs">
            {/* 1. U-Net Flood Mask */}
            <div className="space-y-1.5 pb-2.5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-white font-medium">
                  <input
                    type="checkbox"
                    checked={layers.showUnetFlood}
                    onChange={(e) => onChangeLayers({ showUnetFlood: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-400"
                  />
                  <span>U-Net SAR Flood (Peak)</span>
                </label>
                <Badge variant="derived" size="sm">DERIVED</Badge>
              </div>
              {layers.showUnetFlood && (
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-[10px] text-white/40">Opacity:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layers.opacityUnet}
                    onChange={(e) => onChangeLayers({ opacityUnet: Number(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] text-white/50 font-mono w-6 text-right">
                    {layers.opacityUnet}%
                  </span>
                </div>
              )}
            </div>

            {/* 2. Tier A Baseline Mask */}
            <div className="space-y-1.5 pb-2.5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={layers.showTierABaseline}
                    onChange={(e) => onChangeLayers({ showTierABaseline: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400"
                  />
                  <span>Tier A Otsu Baseline</span>
                </label>
                <Badge variant="derived" size="sm">DERIVED</Badge>
              </div>
            </div>

            {/* 3. Settlement Voronoi Zones */}
            <div className="space-y-1.5 pb-2.5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={layers.showSettlements}
                    onChange={(e) => onChangeLayers({ showSettlements: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-400"
                  />
                  <span>Settlement Zones (20)</span>
                </label>
                <Badge variant="derived" size="sm">DERIVED</Badge>
              </div>
            </div>

            {/* 4. Drivable Roads */}
            <div className="space-y-1.5 pb-2.5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={layers.showRoads}
                    onChange={(e) => onChangeLayers({ showRoads: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-400"
                  />
                  <span>Road Network (OSM)</span>
                </label>
                <Badge variant="real" size="sm">REAL</Badge>
              </div>
            </div>

            {/* 5. Safe Shelters & Facilities */}
            <div className="space-y-1.5 pb-2.5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={layers.showShelters}
                    onChange={(e) => onChangeLayers({ showShelters: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Safe Facilities (32)</span>
                </label>
                <Badge variant="real" size="sm">REAL</Badge>
              </div>
            </div>

            {/* 6. Evacuation Routes */}
            <div className="space-y-1.5 pb-2.5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={layers.showRoutes}
                    onChange={(e) => onChangeLayers({ showRoutes: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Evacuation Routing</span>
                </label>
                <Badge variant="derived" size="sm">DERIVED</Badge>
              </div>
            </div>

            {/* 7. Water-Level What-If Scenario */}
            <div className="space-y-1.5 pb-2.5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={layers.showWhatIf}
                    onChange={(e) => onChangeLayers({ showWhatIf: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-400"
                  />
                  <span>What-If Scenario Inundation</span>
                </label>
                <Badge variant="simulated" size="sm">SIMULATED</Badge>
              </div>
              {layers.showWhatIf && (
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-[10px] text-white/40">Opacity:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={layers.opacityWhatIf}
                    onChange={(e) => onChangeLayers({ opacityWhatIf: Number(e.target.value) })}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                  <span className="text-[10px] text-white/50 font-mono w-6 text-right">
                    {layers.opacityWhatIf}%
                  </span>
                </div>
              )}
            </div>

            {/* 8. Recession Progression */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-white/80">
                  <input
                    type="checkbox"
                    checked={layers.showRecession}
                    onChange={(e) => onChangeLayers({ showRecession: e.target.checked })}
                    className="rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-400"
                  />
                  <span>Recession Scene (June 30)</span>
                </label>
                <Badge variant="derived" size="sm">DERIVED</Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
