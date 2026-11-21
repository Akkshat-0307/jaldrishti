"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { BeaconItem, ZoneFeature } from "../types";
import {
  Bell,
  CheckCircle2,
  Radio,
  Satellite,
  Send,
  Smartphone,
  Volume2,
} from "lucide-react";

interface AlertsTabProps {
  villages?: ZoneFeature[];
  selectedZoneId?: string | null;
}

export function AlertsTab({ villages = [], selectedZoneId }: AlertsTabProps) {
  const [targetZone, setTargetZone] = useState<string>(selectedZoneId || "zone_20");
  const [severity, setSeverity] = useState<"advisory" | "warning" | "evacuate">("warning");
  const [headline, setHeadline] = useState("Flash Flood Warning — Inundation Imminent");
  const [instruction, setInstruction] = useState(
    "Move immediately to designated elevated emergency shelters via primary evacuation corridor."
  );
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  // Sample active beacons
  const [beacons, setBeacons] = useState<BeaconItem[]>([
    {
      id: "BCN-8421",
      lat: 24.8192,
      lon: 92.7441,
      timestamp: "12 min ago",
      group_size: 4,
      need_type: "rescue",
      battery: 68,
      channel: "ble_mesh",
      status: "active",
      payload_code: "JD-AS-05-4R",
    },
    {
      id: "BCN-3190",
      lat: 24.8465,
      lon: 92.7532,
      timestamp: "24 min ago",
      group_size: 2,
      need_type: "medical",
      battery: 42,
      channel: "sms_satellite",
      status: "assigned",
      payload_code: "JD-AS-13-2M",
    },
    {
      id: "BCN-1104",
      lat: 24.7821,
      lon: 92.8123,
      timestamp: "45 min ago",
      group_size: 6,
      need_type: "food_water",
      battery: 85,
      channel: "packet_radio",
      status: "rescued",
      payload_code: "JD-AS-20-6F",
    },
  ]);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastStatus("Broadcasting CAP alert across 5 redundant communication channels...");
    setTimeout(() => {
      setBroadcastStatus("Broadcast Successful: Dispatched to SMS, Cell Broadcast, Voice, Satellite, and VHF Radio.");
      setTimeout(() => setBroadcastStatus(null), 5000);
    }, 1200);
  };

  const handleAcknowledgeBeacon = (id: string) => {
    setBeacons((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "assigned" } : b))
    );
  };

  return (
    <div className="space-y-4 p-4 text-xs text-white" aria-label="Emergency Alerts and Beacon Dispatch">
      {/* 1. CAP Alert Composer */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Bell className="h-4 w-4 text-amber-400" />
            <span>CAP v1.2 Alert Dispatcher</span>
          </div>
          <Badge variant="derived" size="sm">DERIVED (CAP)</Badge>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-2.5">
          {/* Target Zone */}
          <div className="space-y-1">
            <label className="text-[11px] text-white/60">Target Settlement Zone:</label>
            <select
              value={targetZone}
              onChange={(e) => setTargetZone(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {villages.map((v) => (
                <option key={v.properties.zone_id} value={v.properties.zone_id} className="bg-slate-900 text-white">
                  {v.properties.name} (#{v.properties.zone_id}) — {v.properties.isolated ? "Cut Off" : "Connected"}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div className="space-y-1">
            <label className="text-[11px] text-white/60">Alert Urgency / Severity:</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["advisory", "warning", "evacuate"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`py-1 rounded text-[11px] font-bold capitalize transition-colors ${
                    severity === s
                      ? s === "evacuate"
                        ? "bg-red-500/30 text-red-200 border border-red-400/50"
                        : s === "warning"
                        ? "bg-amber-500/30 text-amber-200 border border-amber-400/50"
                        : "bg-blue-500/30 text-blue-200 border border-blue-400/50"
                      : "bg-white/5 text-white/50 border border-white/5 hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Headline & Instruction */}
          <div className="space-y-1">
            <label className="text-[11px] text-white/60">Alert Headline:</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-white/60">Public Protective Instruction:</label>
            <textarea
              rows={2}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          {/* Broadcast Channels Indicator */}
          <div className="flex items-center justify-between text-[10px] text-white/50 pt-1">
            <span>Broadcast Channels:</span>
            <div className="flex items-center gap-2 text-cyan-400">
              <span title="Cell Broadcast"><Smartphone className="h-3.5 w-3.5" /></span>
              <span title="IVR Voice"><Volume2 className="h-3.5 w-3.5" /></span>
              <span title="Satellite Link"><Satellite className="h-3.5 w-3.5" /></span>
              <span title="VHF Radio"><Radio className="h-3.5 w-3.5" /></span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-8 gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Transmit Multi-Channel Alert</span>
          </Button>

          {broadcastStatus && (
            <div className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-2 rounded flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{broadcastStatus}</span>
            </div>
          )}
        </form>
      </div>

      {/* 2. Civilian SOS Beacons Ingestion */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Radio className="h-4 w-4 text-red-400 animate-pulse" />
            <span>Active SOS Beacons ({beacons.length})</span>
          </div>
          <Badge variant="real" size="sm">REAL / INGESTED</Badge>
        </div>

        <div className="space-y-2">
          {beacons.map((b) => (
            <div
              key={b.id}
              className="bg-white/5 border border-white/10 rounded-lg p-2.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white text-xs">{b.id}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    b.status === "active"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : b.status === "assigned"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {b.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/60">
                <span>Need: <strong className="text-white capitalize">{b.need_type}</strong> ({b.group_size} persons)</span>
                <span>Ch: <strong className="text-cyan-300">{b.channel}</strong></span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-white/40 font-mono">
                <span>Bat: {b.battery}%</span>
                <span>{b.timestamp}</span>
              </div>

              {b.status === "active" && (
                <button
                  onClick={() => handleAcknowledgeBeacon(b.id)}
                  className="w-full mt-1 py-1 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-[10px] font-bold"
                >
                  Dispatch Rescue Team
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
