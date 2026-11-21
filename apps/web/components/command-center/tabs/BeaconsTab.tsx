"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { getApiUrl } from "@/lib/api";
import type { BeaconItem } from "../types";
import {
  Battery,
  CheckCircle2,
  Filter,
  MapPin,
  PlusCircle,
  Radio,
  RotateCcw,
  Search,
  Shield,
  Table as TableIcon,
  Users,
  Undo2,
} from "lucide-react";

interface BeaconsTabProps {
  onSelectZone?: (zoneId: string) => void;
  onSelectBeacon?: (beacon: BeaconItem) => void;
}

const RESCUE_TEAMS = [
  "Team Alpha - NDRF Boat 1",
  "Team Bravo - SDRF Boat 2",
  "Team Charlie - Medical Evac",
  "Team Delta - Civil Defence Amphibious",
];

const DEFAULT_BEACONS: BeaconItem[] = [
  {
    id: "bcn_debpara_01",
    lat: 24.861674,
    lon: 92.842047,
    timestamp: new Date().toISOString(),
    need_type: "medical",
    group_size: 6,
    battery: 45.0,
    channel: "online",
    note: "2 elderly residents require insulin & urgent dialysis evacuation.",
    status: "new",
    assigned_team: null,
    nearest_zone_id: "zone_20",
    zone_name: "Debpāra",
    is_cutoff: true,
    touches_edge: false,
    route_or_staging_hint: "Boat or Air Staging suggested (0.44 km to passable highway network).",
    provenance: "SIMULATED",
    payload_code: "AF5O2NIFQ6YZGYVNWAYCCAHCTA",
  },
  {
    id: "bcn_masimpur_02",
    lat: 24.872410,
    lon: 92.812350,
    timestamp: new Date().toISOString(),
    need_type: "boat",
    group_size: 4,
    battery: 78.0,
    channel: "nav_sim",
    note: "Rooftop marooned; ground floor submerged 2.5 meters. Need boat evac.",
    status: "assigned",
    assigned_team: "Team Alpha - NDRF Boat 1",
    nearest_zone_id: "zone_13",
    zone_name: "Māsimpur (North)",
    is_cutoff: true,
    touches_edge: false,
    route_or_staging_hint: "Boat Staging suggested (0.52 km to unflooded embankment).",
    provenance: "SIMULATED",
    payload_code: "AF5O2NIFQ6YZGYVNWAYCCAHCTB",
  },
  {
    id: "bcn_ratpur_03",
    lat: 24.845012,
    lon: 92.715340,
    timestamp: new Date().toISOString(),
    need_type: "food",
    group_size: 8,
    battery: 22.0,
    channel: "sms",
    note: "Drinking water exhausted for 48 hours; infant rations required.",
    status: "new",
    assigned_team: null,
    nearest_zone_id: "zone_02",
    zone_name: "Ratpur",
    is_cutoff: true,
    touches_edge: true,
    route_or_staging_hint: "Boat Staging suggested (window edge zone).",
    provenance: "SIMULATED",
    payload_code: "AF5O2NIFQ6YZGYVNWAYCCAHCTC",
  },
  {
    id: "bcn_ramnagar_04",
    lat: 24.819020,
    lon: 92.785410,
    timestamp: new Date().toISOString(),
    need_type: "medical",
    group_size: 2,
    battery: 65.0,
    channel: "online",
    note: "Fractured limb from collapsed wall; dry access road passable.",
    status: "en_route",
    assigned_team: "Team Bravo - SDRF Ambulatory",
    nearest_zone_id: "zone_06",
    zone_name: "Rāmnagar (West)",
    is_cutoff: false,
    touches_edge: false,
    route_or_staging_hint: "Dry route viable to Lions Eye Hospital (5.30 km, 6.7 min ETA).",
    provenance: "SIMULATED",
    payload_code: "AF5O2NIFQ6YZGYVNWAYCCAHCTD",
  },
  {
    id: "bcn_dudhpatli_05",
    lat: 24.881230,
    lon: 92.834190,
    timestamp: new Date().toISOString(),
    need_type: "boat",
    group_size: 5,
    battery: 88.0,
    channel: "nav_sim",
    note: "Severed interior zone; stranded at school compound high point.",
    status: "new",
    assigned_team: null,
    nearest_zone_id: "zone_18",
    zone_name: "Dudhpatli",
    is_cutoff: true,
    touches_edge: false,
    route_or_staging_hint: "Boat Staging suggested (0.38 km to elevated bund).",
    provenance: "SIMULATED",
    payload_code: "AF5O2NIFQ6YZGYVNWAYCCAHCTE",
  },
];

export function BeaconsTab({ onSelectZone, onSelectBeacon }: BeaconsTabProps) {
  const [beacons, setBeacons] = useState<BeaconItem[]>(DEFAULT_BEACONS);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [needFilter, setNeedFilter] = useState<string>("all");
  const [cutoffFilter, setCutoffFilter] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<Record<string, string>>({});
  const [isTableView, setIsTableView] = useState<boolean>(false);
  const [undoState, setUndoState] = useState<{ id: string; prevStatus: string; prevTeam: string | null } | null>(null);
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const handleClearDemoBeacons = async () => {
    if (!confirm("Reset demo beacons back to clean baseline state?")) return;
    setIsClearing(true);
    try {
      const res = await fetch(getApiUrl("/beacons/clear"), { method: "POST" });
      if (res.ok) {
        await fetchBeacons();
      }
    } catch (e) {
      console.warn("Failed to clear demo beacons:", e);
    } finally {
      setIsClearing(false);
    }
  };

  // Initial Fetch & SSE Setup
  const fetchBeacons = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl("/beacons"));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBeacons(data);
        }
      }
    } catch {
      // In DEMO_MODE=1 or static fallback, keep DEFAULT_BEACONS
    }
  }, []);

  useEffect(() => {
    fetchBeacons();

    // Setup SSE connection
    if (typeof window !== "undefined" && "EventSource" in window) {
      const streamUrl = getApiUrl("/beacons/stream");
      const es = new EventSource(streamUrl);

      es.onopen = () => setSseConnected(true);

      es.addEventListener("ping", () => {
        setSseConnected(true);
      });

      es.addEventListener("sync", () => {
        setSseConnected(true);
      });

      es.addEventListener("beacon", (e: MessageEvent) => {
        try {
          const item = JSON.parse(e.data);
          setBeacons((prev) => {
            const idx = prev.findIndex((b) => b.id === item.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = item;
              return updated;
            }
            return [item, ...prev];
          });
        } catch {}
      });

      es.addEventListener("beacon_created", (e: MessageEvent) => {
        try {
          const item = JSON.parse(e.data);
          setBeacons((prev) => [item, ...prev.filter((b) => b.id !== item.id)]);
        } catch {}
      });

      es.addEventListener("beacon_updated", (e: MessageEvent) => {
        try {
          const item = JSON.parse(e.data);
          setBeacons((prev) => prev.map((b) => (b.id === item.id ? item : b)));
        } catch {}
      });

      es.onerror = () => {
        setSseConnected(false);
      };

      return () => {
        es.close();
      };
    }
  }, [fetchBeacons]);

  // Patch Beacon Status
  const handleUpdateStatus = async (beaconId: string, nextStatus: string, team?: string) => {
    const current = beacons.find((b) => b.id === beaconId);
    if (!current) return;

    setUndoState({
      id: beaconId,
      prevStatus: current.status,
      prevTeam: current.assigned_team ?? null,
    });

    // Optimistic UI update
    setBeacons((prev) =>
      prev.map((b) =>
        b.id === beaconId
          ? { ...b, status: nextStatus, assigned_team: team || b.assigned_team }
          : b
      )
    );

    try {
      await fetch(getApiUrl(`/beacons/${beaconId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          assigned_team: team !== undefined ? team : current.assigned_team,
        }),
      });
    } catch {
      // Revert if API failed and not in demo mode
    }
  };

  // Undo Last Status Change
  const handleUndo = async () => {
    if (!undoState) return;
    const { id, prevStatus, prevTeam } = undoState;
    setUndoState(null);

    setBeacons((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: prevStatus, assigned_team: prevTeam } : b
      )
    );

    try {
      await fetch(`/api/beacons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: prevStatus,
          assigned_team: prevTeam,
        }),
      });
    } catch {}
  };

  // Generate Synthetic Test Beacon (Works in DEMO_MODE=1)
  const handleCreateTestBeacon = async () => {
    const testBeaconsPool = [
      {
        lat: 24.8621,
        lon: 92.8435,
        group_size: 5,
        need_type: "medical",
        note: "Synthetic Demo: Diabetic patient trapped on 2nd floor verandah.",
        zone_id: "zone_20",
        zone_name: "Debpāra",
        is_cutoff: true,
      },
      {
        lat: 24.8824,
        lon: 92.8361,
        group_size: 3,
        need_type: "boat",
        note: "Synthetic Demo: Family of 3 stranded on temple raised platform.",
        zone_id: "zone_18",
        zone_name: "Dudhpatli",
        is_cutoff: true,
      },
    ];

    const pick = testBeaconsPool[Math.floor(Math.random() * testBeaconsPool.length)];
    const newId = `bcn_test_${Date.now().toString().slice(-6)}`;
    const syntheticBeacon: BeaconItem = {
      id: newId,
      lat: pick.lat,
      lon: pick.lon,
      timestamp: new Date().toISOString(),
      group_size: pick.group_size,
      need_type: pick.need_type,
      battery: 82.0,
      channel: "online",
      note: pick.note,
      status: "new",
      assigned_team: null,
      nearest_zone_id: pick.zone_id,
      zone_name: pick.zone_name,
      is_cutoff: pick.is_cutoff,
      touches_edge: false,
      route_or_staging_hint: "Boat or Air Staging suggested (DEMO_MODE=1 synthetic test).",
      provenance: "SIMULATED",
      payload_code: `DEMO${Date.now().toString().slice(-8)}`,
    };

    // Add locally
    setBeacons((prev) => [syntheticBeacon, ...prev]);

    // Send to API if live
    try {
      await fetch(getApiUrl("/beacons"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: pick.lat,
          lon: pick.lon,
          group_size: pick.group_size,
          need_type: pick.need_type,
          battery: 82.0,
          channel: "online",
          note: pick.note,
        }),
      });
    } catch {}
  };

  // KPIs
  const kpis = useMemo(() => {
    let n = 0, a = 0, e = 0, r = 0;
    for (const b of beacons) {
      if (b.status === "new") n++;
      else if (b.status === "assigned") a++;
      else if (b.status === "en_route") e++;
      else if (b.status === "rescued") r++;
    }
    return { new: n, assigned: a, enRoute: e, rescued: r, total: beacons.length };
  }, [beacons]);

  // Filtered Beacons with Strict Priority Ordering
  const filteredBeacons = useMemo(() => {
    return beacons
      .filter((b) => {
        if (statusFilter !== "all" && b.status !== statusFilter) return false;
        if (needFilter !== "all" && b.need_type !== needFilter) return false;
        if (cutoffFilter && !b.is_cutoff) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchId = b.id.toLowerCase().includes(q);
          const matchZone = b.zone_name?.toLowerCase().includes(q);
          const matchNote = b.note?.toLowerCase().includes(q);
          const matchCode = b.payload_code?.toLowerCase().includes(q);
          if (!matchId && !matchZone && !matchNote && !matchCode) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Status sort: new (1) > assigned (2) > en_route (3) > rescued (4)
        const statusRank: Record<string, number> = { new: 1, assigned: 2, en_route: 3, rescued: 4 };
        const sA = statusRank[a.status] || 5;
        const sB = statusRank[b.status] || 5;
        if (sA !== sB) return sA - sB;

        // Cut-off zones first
        if (a.is_cutoff !== b.is_cutoff) return a.is_cutoff ? -1 : 1;

        // Need sort: medical > boat > food > other
        const needRank: Record<string, number> = { medical: 1, boat: 2, food: 3, multiple: 1 };
        const nA = needRank[a.need_type] || 4;
        const nB = needRank[b.need_type] || 4;
        if (nA !== nB) return nA - nB;

        // Group size descending
        return b.group_size - a.group_size;
      });
  }, [beacons, statusFilter, needFilter, cutoffFilter, searchQuery]);

  return (
    <div className="p-4 space-y-4 text-white">
      {/* Header & Controls */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-rose-400 animate-pulse" />
            <h3 className="font-heading text-sm font-bold tracking-wide uppercase text-white">
              Rescue Beacon Responder Console
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleClearDemoBeacons}
              disabled={isClearing}
              className="h-6 text-[10px] font-mono px-2 py-0 border-white/20 text-slate-300 hover:text-white hover:bg-rose-950/40 hover:border-rose-500/50 cursor-pointer"
              title="Reset demo beacons to initial state"
            >
              <RotateCcw className="w-3 h-3 mr-1 text-rose-400" />
              {isClearing ? "Clearing..." : "Clear Demo Beacons"}
            </Button>
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
              title={sseConnected ? "Live SSE Feed Connected" : "Local / Offline Feed"}
            />
            <Badge variant="simulated">SIMULATED</Badge>
          </div>
        </div>
        <p className="text-[11px] text-white/60">
          Decodes 16-byte emergency SOS distress packets from flood-stranded citizens.
        </p>
      </div>

      {/* KPI Counters Strip */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-center">
          <div className="text-lg font-bold font-mono text-rose-400">{kpis.new}</div>
          <div className="text-[10px] uppercase font-mono text-white/60">New SOS</div>
        </div>
        <div className="p-2.5 rounded-lg bg-blue-950/30 border border-blue-500/30 text-center">
          <div className="text-lg font-bold font-mono text-blue-400">{kpis.assigned}</div>
          <div className="text-[10px] uppercase font-mono text-white/60">Assigned</div>
        </div>
        <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-center">
          <div className="text-lg font-bold font-mono text-purple-400">{kpis.enRoute}</div>
          <div className="text-[10px] uppercase font-mono text-white/60">En Route</div>
        </div>
        <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-center">
          <div className="text-lg font-bold font-mono text-emerald-400">{kpis.rescued}</div>
          <div className="text-[10px] uppercase font-mono text-white/60">Rescued</div>
        </div>
      </div>

      {/* Triage Priority Banner */}
      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-white/70 space-y-1">
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Operational Triage Protocol</span>
        </div>
        <p className="text-[10px] text-slate-300 leading-tight">
          Priority sorting: <strong>Cut-off interior zones first</strong> &rarr; <strong>Medical critical</strong> &rarr; <strong>Boat required</strong> &rarr; <strong>Water/Food</strong> &rarr; <strong>Group size (desc)</strong>.
        </p>
      </div>

      {/* Search and Action Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search zone, note, or ID..."
              className="w-full bg-white/5 border border-white/10 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleCreateTestBeacon}
            className="gap-1 h-8 text-xs shrink-0 bg-rose-950/30 border-rose-500/30 text-rose-300 hover:bg-rose-900/50"
            title="Inject synthetic test beacon without external network"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Test SOS</span>
          </Button>

          <button
            onClick={() => setIsTableView(!isTableView)}
            className={`p-1.5 rounded border text-xs flex items-center justify-center h-8 w-8 transition-colors ${
              isTableView
                ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                : "bg-white/5 border-white/10 text-white/60 hover:text-white"
            }`}
            title="Toggle Accessibility Table View"
            aria-label="Toggle Table View"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
          <Filter className="w-3 h-3 text-white/40 shrink-0" />
          {["all", "new", "assigned", "en_route", "rescued"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-0.5 rounded capitalize transition-colors ${
                statusFilter === st
                  ? "bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-bold"
                  : "bg-white/5 text-white/50 hover:text-white"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
          <button
            onClick={() => setCutoffFilter(!cutoffFilter)}
            className={`px-2 py-0.5 rounded transition-colors ${
              cutoffFilter
                ? "bg-red-500/30 text-red-200 border border-red-400/40 font-bold"
                : "bg-white/5 text-white/50 hover:text-white"
            }`}
          >
            Cut-off Only
          </button>
        </div>

        {/* Need Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
          <span className="text-white/40 text-[10px] uppercase shrink-0">Need:</span>
          {["all", "medical", "boat", "food", "multiple"].map((nd) => (
            <button
              key={nd}
              onClick={() => setNeedFilter(nd)}
              className={`px-2 py-0.5 rounded capitalize transition-colors ${
                needFilter === nd
                  ? "bg-amber-500/30 text-amber-200 border border-amber-400/40 font-bold"
                  : "bg-white/5 text-white/50 hover:text-white"
              }`}
            >
              {nd}
            </button>
          ))}
        </div>
      </div>

      {/* Undo Toast Banner */}
      {undoState && (
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs font-mono animate-fadeIn">
          <span className="text-amber-200">
            Updated status for <strong>{undoState.id}</strong>
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUndo}
            className="h-6 px-2 gap-1 text-[11px] bg-amber-500/20 border-amber-500/40 text-amber-200 hover:bg-amber-500/40"
          >
            <Undo2 className="w-3 h-3" /> Undo
          </Button>
        </div>
      )}

      {/* Main Beacons List / Table */}
      {isTableView ? (
        /* Accessible Screen-Reader Optimized Table */
        <div className="overflow-x-auto border border-white/10 rounded-lg bg-black/40">
          <table className="w-full text-left text-xs font-mono border-collapse" aria-label="Rescue Beacons Triage Table">
            <caption className="sr-only">Live emergency distress beacons received from flooded zones</caption>
            <thead>
              <tr className="bg-white/5 text-white/70 border-b border-white/10">
                <th className="p-2">ID</th>
                <th className="p-2">Zone</th>
                <th className="p-2">Need</th>
                <th className="p-2">People</th>
                <th className="p-2">Status</th>
                <th className="p-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {filteredBeacons.map((b) => (
                <tr key={b.id} className="hover:bg-white/5">
                  <td className="p-2 font-bold text-white">{b.id}</td>
                  <td className="p-2">
                    <span className={b.is_cutoff ? "text-rose-400 font-bold" : "text-emerald-400"}>
                      {b.zone_name} {b.is_cutoff ? "(Cut-Off)" : ""}
                    </span>
                  </td>
                  <td className="p-2 capitalize">{b.need_type}</td>
                  <td className="p-2">{b.group_size}</td>
                  <td className="p-2 capitalize font-semibold">{b.status.replace("_", " ")}</td>
                  <td className="p-2">
                    {b.status === "new" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUpdateStatus(b.id, "assigned", RESCUE_TEAMS[0])}
                        className="h-6 text-[10px]"
                      >
                        Assign
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Interactive Cards List */
        <div className="space-y-3">
          {filteredBeacons.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-white/40 border border-dashed border-white/10 rounded-xl">
              No distress beacons match the selected triage criteria.
            </div>
          ) : (
            filteredBeacons.map((b) => (
              <GlassCard
                key={b.id}
                className={`p-3.5 space-y-2.5 transition-all ${
                  b.status === "new"
                    ? "border-rose-500/40 bg-rose-950/10"
                    : b.status === "assigned"
                    ? "border-blue-500/30 bg-blue-950/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {/* Beacon Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">{b.id}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold ${
                          b.status === "new"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                            : b.status === "assigned"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : b.status === "en_route"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </div>

                    {/* Zone & Cut-Off Badge */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        onClick={() => {
                          if (b.nearest_zone_id && onSelectZone) {
                            onSelectZone(b.nearest_zone_id);
                          }
                          if (onSelectBeacon) {
                            onSelectBeacon(b);
                          }
                        }}
                        className="text-cyan-300 hover:text-cyan-100 flex items-center gap-1 font-semibold group cursor-pointer"
                        title="Focus zone on map"
                      >
                        <MapPin className="w-3 h-3 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span>{b.zone_name}</span>
                      </button>

                      {b.is_cutoff ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                          CUT-OFF
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          CONNECTED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Chips */}
                  <div className="text-right text-[10px] font-mono space-y-0.5 text-white/60">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="w-3 h-3 text-white/40" />
                      <span className="font-bold text-white">{b.group_size}</span>
                    </div>
                    {b.battery !== null && b.battery !== undefined && (
                      <div className="flex items-center justify-end gap-1">
                        <Battery className="w-3 h-3 text-white/40" />
                        <span>{b.battery}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Need Category & User Note */}
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-white/50">Need:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium capitalize bg-white/10 text-white">
                      {b.need_type}
                    </span>
                    <span className="text-[10px] font-mono text-white/40 truncate">
                      {b.payload_code}
                    </span>
                  </div>

                  {b.note && (
                    <p className="text-xs text-slate-300 bg-black/30 p-2 rounded border border-white/5 italic">
                      &ldquo;{b.note}&rdquo;
                    </p>
                  )}
                </div>

                {/* Staging Hint */}
                {b.route_or_staging_hint && (
                  <div className="text-[11px] font-mono text-slate-400 bg-white/5 p-2 rounded border border-white/5">
                    {b.route_or_staging_hint}
                  </div>
                )}

                {/* State Machine Transition Actions */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  {b.status === "new" && (
                    <div className="flex items-center gap-2 w-full">
                      <select
                        value={selectedTeam[b.id] || RESCUE_TEAMS[0]}
                        onChange={(e) => setSelectedTeam({ ...selectedTeam, [b.id]: e.target.value })}
                        className="bg-black/60 border border-white/20 text-xs text-white rounded px-2 py-1 flex-1 focus:outline-none"
                        aria-label={`Select rescue team for beacon ${b.id}`}
                      >
                        {RESCUE_TEAMS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleUpdateStatus(b.id, "assigned", selectedTeam[b.id] || RESCUE_TEAMS[0])}
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                      >
                        Assign Team
                      </Button>
                    </div>
                  )}

                  {b.status === "assigned" && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-mono text-blue-300 truncate max-w-[180px]">
                        {b.assigned_team}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(b.id, "new", "")}
                          className="h-7 text-[10px] px-2 text-white/60"
                        >
                          Unassign
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(b.id, "en_route")}
                          className="h-7 text-xs bg-purple-900/40 border-purple-500/30 text-purple-200 hover:bg-purple-900/60"
                        >
                          Mark En Route
                        </Button>
                      </div>
                    </div>
                  )}

                  {b.status === "en_route" && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-mono text-purple-300 truncate max-w-[180px]">
                        {b.assigned_team} (En Route)
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleUpdateStatus(b.id, "rescued")}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                      >
                        Confirm Rescued
                      </Button>
                    </div>
                  )}

                  {b.status === "rescued" && (
                    <div className="flex items-center justify-between w-full text-emerald-400 text-xs font-mono">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Evacuated &amp; Safely Reached</span>
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUpdateStatus(b.id, "en_route")}
                        className="h-6 text-[10px] px-2 text-white/50"
                      >
                        Reopen
                      </Button>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}
    </div>
  );
}
