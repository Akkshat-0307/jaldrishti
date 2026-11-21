"use client";

import React, { useEffect, useState } from "react";
import type { ZoneFeature } from "./types";
import {
  Compass,
  Layers,
  MapPin,
  Play,
  Search,
  Table,
  X,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  villages?: ZoneFeature[];
  onSelectZone: (zoneId: string) => void;
  onSelectTab: (tabId: string) => void;
  onToggleTableView: () => void;
  onStartTour: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  villages = [],
  onSelectZone,
  onSelectTab,
  onToggleTableView,
  onStartTour,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredVillages = villages.filter(
    (v) =>
      v.properties.name.toLowerCase().includes(query.toLowerCase()) ||
      v.properties.zone_id.toLowerCase().includes(query.toLowerCase())
  );

  const quickActions = [
    {
      id: "action-tour",
      label: "Run Guided Demo Tour",
      icon: Play,
      action: () => {
        onStartTour();
        onClose();
      },
    },
    {
      id: "action-table",
      label: "Toggle Accessible Data Table View",
      icon: Table,
      action: () => {
        onToggleTableView();
        onClose();
      },
    },
    {
      id: "tab-routes",
      label: "Open Evacuation Routing Tab",
      icon: Compass,
      action: () => {
        onSelectTab("routes");
        onClose();
      },
    },
    {
      id: "tab-whatif",
      label: "Open Water-Level What-If Scenarios",
      icon: Layers,
      action: () => {
        onSelectTab("whatif");
        onClose();
      },
    },
  ].filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette and quick navigator"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-950 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-3 border-b border-white/10 flex items-center gap-2">
          <Search className="h-4 w-4 text-white/50" />
          <input
            autoFocus
            type="text"
            placeholder="Search settlement, route, or quick action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-white/40 hover:text-white"
            aria-label="Close command palette"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          {/* Actions */}
          {quickActions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                Quick Actions
              </div>
              {quickActions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={a.action}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{a.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Villages */}
          {filteredVillages.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider mt-2">
                Settlement Zones ({filteredVillages.length})
              </div>
              {filteredVillages.map((v) => (
                <button
                  key={v.properties.zone_id}
                  onClick={() => {
                    onSelectZone(v.properties.zone_id);
                    onSelectTab("villages");
                    onClose();
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/10 flex items-center justify-between text-white/80 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-amber-400" />
                    <span className="font-medium text-white">{v.properties.name}</span>
                    <span className="text-[10px] text-white/40 font-mono">#{v.properties.zone_id}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      v.properties.isolated
                        ? "bg-red-500/20 text-red-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {v.properties.isolated ? "Cut Off" : "Connected"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {quickActions.length === 0 && filteredVillages.length === 0 && (
            <div className="p-6 text-center text-white/40 text-xs">
              No matching settlements or commands found for &quot;{query}&quot;.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
