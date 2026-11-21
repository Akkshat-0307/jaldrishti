"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { RouteItem, ZoneFeature } from "./types";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Search,
  Table as TableIcon,
} from "lucide-react";

interface AccessibleDataTableProps {
  villages?: ZoneFeature[];
  routes?: Record<string, RouteItem>;
  onClose: () => void;
}

export function AccessibleDataTable({ villages = [], routes = {}, onClose }: AccessibleDataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "cutoff" | "connected">("all");
  const [robustOnly, setRobustOnly] = useState(false);
  const [sortField, setSortField] = useState<string>("priority_score");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filter and sort records
  const filteredRecords = useMemo(() => {
    return villages
      .map((feat) => {
        const p = feat.properties;
        const zid = p.zone_id;
        const r = routes[zid];
        return {
          zone_id: zid,
          name: p.name,
          block: p.block,
          rank: p.rank,
          isolated: p.isolated,
          has_route: r?.has_route ?? !p.isolated,
          has_alternate: r?.has_alternate ?? false,
          touches_window_edge: p.touches_window_edge,
          population: p.population,
          population_exposed: p.population_exposed,
          population_of_cutoff_zone: p.population_of_cutoff_zone,
          flooded_area_ha: p.flooded_area_ha,
          priority_score: p.priority_score,
        };
      })
      .filter((row) => {
        // Search
        if (
          searchTerm &&
          !row.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !row.zone_id.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        // Status
        if (statusFilter === "cutoff" && !row.isolated) return false;
        if (statusFilter === "connected" && row.isolated) return false;
        // Robust
        if (robustOnly && row.isolated && row.touches_window_edge) return false;

        return true;
      })
      .sort((a, b) => {
        const valA = (a as Record<string, unknown>)[sortField];
        const valB = (b as Record<string, unknown>)[sortField];
        if (typeof valA === "string" && typeof valB === "string") {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [villages, routes, searchTerm, statusFilter, robustOnly, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Zone ID",
      "Name",
      "Block",
      "Rank",
      "Status",
      "Has Route",
      "Has Alternate",
      "Touches Window Edge",
      "Total Population",
      "Exposed Population",
      "Cut-off Population",
      "Flooded Area (ha)",
      "Priority Score",
    ];
    const rows = filteredRecords.map((r) => [
      r.zone_id,
      `"${r.name}"`,
      `"${r.block}"`,
      r.rank,
      r.isolated ? "Cut Off" : "Connected",
      r.has_route ? "Yes" : "No",
      r.has_alternate ? "Yes" : "No",
      r.touches_window_edge ? "Yes" : "No",
      r.population,
      r.population_exposed,
      r.population_of_cutoff_zone,
      r.flooded_area_ha,
      r.priority_score,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `jaldrishti_cachar_settlement_impact_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="region"
      aria-labelledby="accessible-table-heading"
      className="fixed inset-0 top-14 z-40 bg-slate-950 p-6 overflow-y-auto flex flex-col gap-4 text-white"
    >
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <TableIcon className="h-5 w-5 text-amber-400" />
            <h2 id="accessible-table-heading" className="text-lg font-bold">
              Accessible Settlement Zone Impact Registry
            </h2>
            <Badge variant="derived" size="sm">DERIVED</Badge>
          </div>
          <p className="text-xs text-white/60 mt-1">
            Complete empirical tabulation of all 20 Cachar settlement zones synthesized via Voronoi diagram of OSM villages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs font-medium flex items-center gap-1.5 hover:bg-white/20 transition-colors"
            title="Download CSV export"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
          >
            Return to Map
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search village name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
            aria-label="Filter settlement zones by name"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1">
          <span className="text-white/50 text-[11px]">Status:</span>
          {(["all", "cutoff", "connected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                statusFilter === s
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/50"
                  : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {s === "all" ? "All (20)" : s === "cutoff" ? "Cut Off (8)" : "Connected (12)"}
            </button>
          ))}
        </div>

        {/* Robust Toggle */}
        <label className="flex items-center gap-2 cursor-pointer text-white/80 select-none pl-2 border-l border-white/10">
          <input
            type="checkbox"
            checked={robustOnly}
            onChange={(e) => setRobustOnly(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-400"
          />
          <span>Robust Cut-offs Only (excl. 5 edge zones)</span>
        </label>
      </div>

      {/* Accessible Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/50">
        <table className="w-full text-left text-xs" aria-label="Settlement Zone Flood Impact Data">
          <caption className="sr-only">
            Settlement zones in Cachar, Assam showing flood exposure, isolation status, and evacuation priority scores.
          </caption>
          <thead className="bg-white/10 border-b border-white/10 text-white/80 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th scope="col" className="p-3 cursor-pointer" onClick={() => handleSort("zone_id")}>
                <div className="flex items-center gap-1">
                  <span>Zone ID</span>
                  {sortField === "zone_id" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </div>
              </th>
              <th scope="col" className="p-3 cursor-pointer" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">
                  <span>Settlement Name</span>
                  {sortField === "name" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </div>
              </th>
              <th scope="col" className="p-3 cursor-pointer" onClick={() => handleSort("isolated")}>
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sortField === "isolated" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </div>
              </th>
              <th scope="col" className="p-3">Route Avail.</th>
              <th scope="col" className="p-3">Touches Edge</th>
              <th scope="col" className="p-3 cursor-pointer" onClick={() => handleSort("population")}>
                <div className="flex items-center gap-1">
                  <span>Total Pop</span>
                  {sortField === "population" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </div>
              </th>
              <th scope="col" className="p-3 cursor-pointer" onClick={() => handleSort("population_exposed")}>
                <div className="flex items-center gap-1">
                  <span>Exposed Pop</span>
                  {sortField === "population_exposed" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </div>
              </th>
              <th scope="col" className="p-3 cursor-pointer" onClick={() => handleSort("flooded_area_ha")}>
                <div className="flex items-center gap-1">
                  <span>Flooded ha</span>
                  {sortField === "flooded_area_ha" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </div>
              </th>
              <th scope="col" className="p-3 cursor-pointer" onClick={() => handleSort("priority_score")}>
                <div className="flex items-center gap-1">
                  <span>Priority Score</span>
                  {sortField === "priority_score" && (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-mono text-[11px]">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-white/40">
                  No settlement zones match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((row) => (
                <tr key={row.zone_id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-bold text-white/70">{row.zone_id}</td>
                  <td className="p-3 font-sans font-medium text-white">{row.name}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.isolated
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {row.isolated ? "CUT OFF" : "CONNECTED"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={row.has_route ? "text-emerald-400" : "text-red-400 font-bold"}>
                      {row.has_route ? (row.has_alternate ? "Yes (+ Alt)" : "Yes") : "No"}
                    </span>
                  </td>
                  <td className="p-3">
                    {row.touches_window_edge ? (
                      <span className="text-amber-400">Yes (Edge)</span>
                    ) : (
                      <span className="text-white/40">No</span>
                    )}
                  </td>
                  <td className="p-3 text-white/80">{row.population.toLocaleString()}</td>
                  <td className="p-3 text-amber-300 font-bold">{row.population_exposed.toLocaleString()}</td>
                  <td className="p-3 text-blue-300">{row.flooded_area_ha.toFixed(1)} ha</td>
                  <td className="p-3 text-purple-300 font-bold">{row.priority_score.toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
