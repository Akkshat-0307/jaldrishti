"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Languages,
  Play,
  Satellite,
  Search,
  Table as TableIcon,
  Map as MapIcon,
} from "lucide-react";

interface TopBarProps {
  currentLang: string;
  onSelectLang: (lang: string) => void;
  viewMode: "map" | "table";
  onToggleViewMode: (mode: "map" | "table") => void;
  onStartTour: () => void;
  onOpenCommandPalette: () => void;
}

export function TopBar({
  currentLang,
  onSelectLang,
  viewMode,
  onToggleViewMode,
  onStartTour,
  onOpenCommandPalette,
}: TopBarProps) {
  const languages = [
    { code: "en", label: "English" },
    { code: "as", label: "অসমীয়া" },
    { code: "hi", label: "हिन्दी" },
    { code: "bn", label: "বাংলা" },
  ];

  return (
    <header className="h-14 border-b border-white/10 bg-black/60 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
      {/* Brand & Event Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold tracking-tight text-white text-base">
          <div className="h-7 w-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Satellite className="h-4 w-4" />
          </div>
          <span>JalDrishti</span>
        </div>

        <div className="h-4 w-px bg-white/20 mx-1 hidden sm:block" />

        <div className="hidden sm:flex items-center gap-2">
          <select
            className="bg-white/5 border border-white/10 text-xs text-white rounded-md px-2.5 py-1 focus:outline-none focus:border-cyan-400"
            defaultValue="assam-2022"
            aria-label="Active flood disaster event selector"
          >
            <option value="assam-2022">Assam Flood — June 2022 (Cachar / Silchar)</option>
          </select>
          <Badge variant="real" size="sm">
            REAL SATELLITE
          </Badge>
        </div>
      </div>

      {/* Actions & Utilities */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Quick search (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Quick search...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/20 text-[10px] font-mono text-slate-300">
            ⌘K
          </kbd>
        </button>

        {/* Guided Tour Trigger */}
        <Button
          id="tour-button"
          size="sm"
          variant="secondary"
          onClick={onStartTour}
          className="h-8 gap-1.5 text-xs text-cyan-300 border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/50"
        >
          <Play className="h-3.5 w-3.5 fill-cyan-400 text-cyan-400" />
          <span>Run demo tour</span>
        </Button>

        {/* Accessible Table View Toggle */}
        <button
          onClick={() => onToggleViewMode(viewMode === "map" ? "table" : "map")}
          className={`h-8 px-2.5 rounded-md border text-xs flex items-center gap-1.5 transition-colors ${
            viewMode === "table"
              ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
              : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
          }`}
          title="Toggle between Map View and Accessible Screen-Reader Data Table View"
          aria-label={viewMode === "map" ? "Switch to accessible data table view" : "Switch to interactive map view"}
        >
          {viewMode === "map" ? (
            <>
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Table View</span>
            </>
          ) : (
            <>
              <MapIcon className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Map View</span>
            </>
          )}
        </button>

        {/* Language Selector */}
        <div className="relative flex items-center">
          <Languages className="h-3.5 w-3.5 text-white/40 absolute left-2 pointer-events-none" />
          <select
            value={currentLang}
            onChange={(e) => onSelectLang(e.target.value)}
            className="bg-white/5 border border-white/10 text-xs text-white rounded-md pl-7 pr-2.5 py-1 focus:outline-none focus:border-cyan-400"
            aria-label="Select interface language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {/* Demo Mode Badge */}
        <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>DEMO_MODE=1</span>
        </div>
      </div>
    </header>
  );
}
