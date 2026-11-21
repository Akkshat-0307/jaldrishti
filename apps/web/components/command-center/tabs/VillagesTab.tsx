"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { ZoneFeature } from "../types";
import {
  ChevronRight,
  MapPin,
  Search,
} from "lucide-react";

interface VillagesTabProps {
  villages?: ZoneFeature[];
  selectedZoneId?: string | null;
  onSelectZone: (zoneId: string) => void;
  robustCutoffsOnly: boolean;
  onToggleRobust: () => void;
}

export function VillagesTab({
  villages = [],
  selectedZoneId,
  onSelectZone,
  robustCutoffsOnly,
  onToggleRobust,
}: VillagesTabProps) {
  const [search, setSearch] = useState("");

  const filteredVillages = useMemo(() => {
    return villages
      .filter((v) => {
        const p = v.properties;
        if (
          search &&
          !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !p.zone_id.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        if (robustCutoffsOnly && p.isolated && p.touches_window_edge) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.properties.priority_score - a.properties.priority_score);
  }, [villages, search, robustCutoffsOnly]);

  const cutoffCount = villages.filter((v) => v.properties.isolated).length;
  const robustCount = villages.filter((v) => v.properties.isolated && !v.properties.touches_window_edge).length;

  return (
    <div className="space-y-3 p-4 text-xs text-white" aria-label="Settlement Zones Ranking">
      {/* Header & Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-amber-400" />
            <span>Settlement Zones ({filteredVillages.length} / 20)</span>
          </div>
          <Badge variant="derived" size="sm">DERIVED</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search village by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Robust Cut-Off Toggle */}
        <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5 text-[11px]">
          <span className="text-white/70">
            Cut-off settlements: <span className="font-bold text-red-300 font-mono">{cutoffCount} total</span> ({robustCount} robust)
          </span>
          <button
            id="robust-toggle"
            onClick={onToggleRobust}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              robustCutoffsOnly
                ? "bg-amber-500/30 text-amber-200 border border-amber-400/50"
                : "bg-white/10 text-white/60 hover:text-white"
            }`}
          >
            {robustCutoffsOnly ? "Showing Robust Only (3)" : "Show Robust Only"}
          </button>
        </div>
      </div>

      {/* Villages List */}
      <div className="space-y-1.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {filteredVillages.map((feat) => {
          const p = feat.properties;
          const isSelected = p.zone_id === selectedZoneId;
          const isCutoff = p.isolated;

          return (
            <button
              key={p.zone_id}
              onClick={() => onSelectZone(p.zone_id)}
              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                isSelected
                  ? "bg-cyan-950/60 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{p.name}</span>
                  <span className="text-[10px] text-white/40 font-mono">#{p.zone_id}</span>
                  {p.touches_window_edge && (
                    <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Edge
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-white/60 font-mono">
                  <span>Pop: {p.population.toLocaleString()}</span>
                  <span>•</span>
                  <span className="text-amber-300">{p.population_exposed.toLocaleString()} exp</span>
                  <span>•</span>
                  <span className="text-blue-300">{p.flooded_area_ha.toFixed(1)} ha</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCutoff
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {isCutoff ? "CUT OFF" : "CONNECTED"}
                  </div>
                  <div className="text-[10px] font-mono text-purple-300 font-bold mt-1">
                    Score {p.priority_score.toFixed(1)}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
