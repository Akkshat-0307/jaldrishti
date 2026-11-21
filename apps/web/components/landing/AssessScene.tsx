"use client";

import React, { useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";

interface VillageItem {
  id: string;
  name: string;
  rank: number;
  robustRank?: number;
  population: number;
  exposedPop: number;
  priorityScore: number;
  isCutoff: boolean;
  touchesEdge: boolean;
  category: "robust" | "edge" | "connected";
}

const VILLAGES: VillageItem[] = [
  {
    id: "zone_20",
    name: "Masimpur",
    rank: 1,
    robustRank: 1,
    population: 44734,
    exposedPop: 12480,
    priorityScore: 0.889,
    isCutoff: true,
    touchesEdge: false,
    category: "robust",
  },
  {
    id: "zone_02",
    name: "Ratpur",
    rank: 2,
    population: 14578,
    exposedPop: 6810,
    priorityScore: 0.732,
    isCutoff: true,
    touchesEdge: true,
    category: "edge",
  },
  {
    id: "zone_03",
    name: "Badripāra",
    rank: 3,
    population: 9751,
    exposedPop: 5120,
    priorityScore: 0.702,
    isCutoff: true,
    touchesEdge: true,
    category: "edge",
  },
  {
    id: "zone_01",
    name: "Kirishanpur",
    rank: 4,
    population: 10243,
    exposedPop: 4610,
    priorityScore: 0.675,
    isCutoff: true,
    touchesEdge: true,
    category: "edge",
  },
  {
    id: "zone_14",
    name: "Gossaipur",
    rank: 5,
    population: 9664,
    exposedPop: 3980,
    priorityScore: 0.648,
    isCutoff: true,
    touchesEdge: true,
    category: "edge",
  },
  {
    id: "zone_13",
    name: "Dudhpatil",
    rank: 6,
    robustRank: 2,
    population: 5162,
    exposedPop: 2450,
    priorityScore: 0.612,
    isCutoff: true,
    touchesEdge: false,
    category: "robust",
  },
  {
    id: "zone_18",
    name: "Tupkhana",
    rank: 7,
    robustRank: 3,
    population: 4049,
    exposedPop: 2037,
    priorityScore: 0.584,
    isCutoff: true,
    touchesEdge: false,
    category: "robust",
  },
  {
    id: "zone_09",
    name: "Khoril",
    rank: 8,
    population: 2129,
    exposedPop: 994,
    priorityScore: 0.490,
    isCutoff: true,
    touchesEdge: true,
    category: "edge",
  },
  {
    id: "zone_17",
    name: "Silchar Urban Hub",
    rank: 9,
    robustRank: 4,
    population: 178214,
    exposedPop: 41200,
    priorityScore: 0.420,
    isCutoff: false,
    touchesEdge: false,
    category: "connected",
  },
  {
    id: "zone_19",
    name: "Udharbond",
    rank: 10,
    robustRank: 5,
    population: 38410,
    exposedPop: 7800,
    priorityScore: 0.380,
    isCutoff: false,
    touchesEdge: false,
    category: "connected",
  },
];

export function AssessScene() {
  const [filter, setFilter] = useState<"all" | "cutoff" | "robust">("cutoff");

  const filtered = VILLAGES.filter((v) => {
    if (filter === "cutoff") return v.isCutoff;
    if (filter === "robust") return v.category === "robust";
    return true;
  });

  return (
    <section className="py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-12 border-t border-white/10">
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-alert-500/10 border border-alert-500/20 text-alert-500 text-xs font-mono font-semibold">
          <Users className="w-3.5 h-3.5" />
          <span>SCENE 06 / IMPACT ASSESSMENT</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
          Assess: <br />
          <span className="text-alert-500">Topological Isolation &amp; Village Prioritization</span>.
        </h2>

        <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed">
          Overlaying flood boundaries onto the OpenStreetMap road graph reveals 8 cut-off communities
          whose road corridors to shelters are fully submerged. Of these, 3 are robust interior isolations,
          while 5 lie near the study window boundary.
        </p>
      </div>

      {/* KPI Ticker Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
          <span className="text-xs text-slate-400">TOTAL POPULATION</span>
          <div className="text-2xl font-bold text-white">427,338</div>
          <p className="text-[11px] text-slate-400">100% Reconciled Raster Total</p>
        </div>

        <div className="p-4 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
          <span className="text-xs text-slate-400">EXPOSED INSIDE FLOOD</span>
          <div className="text-2xl font-bold text-flood-400">101,986</div>
          <p className="text-[11px] text-slate-400">Directly Inundated</p>
        </div>

        <div className="p-4 rounded-lg bg-space-900/60 border border-alert-500/30 space-y-1">
          <span className="text-xs text-slate-400">ALL 8 CUT-OFF ZONES</span>
          <div className="text-2xl font-bold text-alert-500">100,310</div>
          <p className="text-[11px] text-slate-400">38,481 Exposed</p>
        </div>

        <div className="p-4 rounded-lg bg-space-900/60 border border-amber-400/30 space-y-1">
          <span className="text-xs text-slate-400">3 ROBUST INTERIOR</span>
          <div className="text-2xl font-bold text-amber-400">53,945</div>
          <p className="text-[11px] text-slate-400">Masimpur, Dudhpatil, Tupkhana</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <span className="text-xs font-mono text-slate-400 mr-2">Filter View:</span>
        <button
          onClick={() => setFilter("cutoff")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
            filter === "cutoff"
              ? "bg-rose-600 text-white border-rose-400 font-bold"
              : "bg-space-900 text-slate-300 border-white/10 hover:text-white"
          }`}
        >
          All 8 Cut-Off Zones (100,310 pop)
        </button>
        <button
          onClick={() => setFilter("robust")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
            filter === "robust"
              ? "bg-amber-400 text-space-950 border-amber-300 font-bold"
              : "bg-space-900 text-slate-300 border-white/10 hover:text-white"
          }`}
        >
          3 Robust Interior Only (53,945 pop)
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
            filter === "all"
              ? "bg-space-800 text-white border-white/30 font-bold"
              : "bg-space-900 text-slate-300 border-white/10 hover:text-white"
          }`}
        >
          All 20 Study Zones
        </button>
      </div>

      {/* Horizontally Scrolled Pinned Cards */}
      <div className="relative overflow-x-auto pb-6 scrollbar-thin">
        <div className="flex gap-4 min-w-max">
          {filtered.map((item) => (
            <GlassCard
              key={item.id}
              className={`w-72 p-5 space-y-4 shrink-0 transition-transform duration-300 hover:-translate-y-1 ${
                item.isCutoff ? "border-alert-500/40" : "border-white/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-space-800 text-slate-300">
                    Rank #{item.rank}
                  </span>
                  {item.robustRank && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Robust #{item.robustRank}
                    </span>
                  )}
                </div>

                {item.isCutoff ? (
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-alert-500" />
                    </span>
                    <Badge variant="simulated">CUT OFF</Badge>
                  </div>
                ) : (
                  <Badge variant="real">CONNECTED</Badge>
                )}
              </div>

              <div>
                <h3 className="font-heading font-bold text-lg text-white">{item.name}</h3>
                <p className="font-mono text-xs text-slate-400">{item.id}</p>
              </div>

              <div className="space-y-1.5 text-xs font-mono pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Population:</span>
                  <span className="text-white font-semibold">{item.population.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Exposed Population:</span>
                  <span className="text-flood-400 font-semibold">{item.exposedPop.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Priority Score:</span>
                  <span className="text-amber-400 font-bold">{item.priorityScore.toFixed(3)}</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] font-mono">
                {item.touchesEdge ? (
                  <span className="text-amber-400/90 bg-amber-400/10 px-2 py-1 rounded inline-block">
                    ⚠️ Touches Window Edge
                  </span>
                ) : item.isCutoff ? (
                  <span className="text-alert-400 bg-alert-500/10 px-2 py-1 rounded inline-block">
                    🚨 Robust Interior Isolation
                  </span>
                ) : (
                  <span className="text-safe-400 bg-safe-500/10 px-2 py-1 rounded inline-block">
                    ✅ Active Road Corridors
                  </span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
