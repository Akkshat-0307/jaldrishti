"use client";

import React from "react";
import {
  Bell,
  Cpu,
  Droplets,
  MapPin,
  Navigation,
  Radio,
  Sliders,
} from "lucide-react";
import { ImpactTab } from "./tabs/ImpactTab";
import { VillagesTab } from "./tabs/VillagesTab";
import { RoutesTab } from "./tabs/RoutesTab";
import { BeaconsTab } from "./tabs/BeaconsTab";
import { AlertsTab } from "./tabs/AlertsTab";
import { WhatIfTab } from "./tabs/WhatIfTab";
import { ModelTab } from "./tabs/ModelTab";
import type {
  ImpactSummary,
  RiverOutlook,
  RouteItem,
  ScenariosIndex,
  ZoneFeature,
} from "./types";

interface TabDrawerProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  summary?: ImpactSummary | null;
  riverOutlook?: RiverOutlook | null;
  villages?: ZoneFeature[];
  selectedZoneId?: string | null;
  onSelectZone: (zoneId: string) => void;
  robustCutoffsOnly: boolean;
  onToggleRobust: () => void;
  routeData?: RouteItem | null;
  scenariosIndex?: ScenariosIndex | null;
  activeDelta: number;
  onSelectDelta: (delta: number) => void;
}

export function TabDrawer({
  activeTab,
  onSelectTab,
  summary,
  riverOutlook,
  villages = [],
  selectedZoneId,
  onSelectZone,
  robustCutoffsOnly,
  onToggleRobust,
  routeData,
  scenariosIndex,
  activeDelta,
  onSelectDelta,
}: TabDrawerProps) {
  const tabs = [
    { id: "impact", label: "Impact", icon: Droplets },
    { id: "villages", label: "Villages", icon: MapPin },
    { id: "routes", label: "Routes", icon: Navigation },
    { id: "beacons", label: "Beacons", icon: Radio },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "whatif", label: "What-If", icon: Sliders },
    { id: "model", label: "Model Card", icon: Cpu },
  ];

  return (
    <aside
      id="tab-drawer"
      aria-label="Intelligence drawer tabs"
      className="w-full lg:w-96 border-l border-white/10 bg-slate-950/85 backdrop-blur-md flex flex-col h-full z-20 shrink-0"
    >
      {/* Tab Navigation Header with Fade Edges */}
      <div className="relative border-b border-white/10 bg-black/40 shrink-0">
        {/* Left fade edge */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent z-10" />

        {/* Scrollable tabs container */}
        <div className="flex overflow-x-auto scrollbar-none px-1.5 py-1 scroll-smooth">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`${t.id}-tab`}
                onClick={() => onSelectTab(t.id)}
                className={`min-w-[66px] shrink-0 py-2 px-2 flex flex-col items-center gap-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "border-cyan-400/60 text-white bg-cyan-950/40 shadow-sm"
                    : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-cyan-400" : "text-white/40"}`} />
                <span className="text-[11px] whitespace-nowrap tracking-tight">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right fade edge */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-10" />
      </div>

      {/* Tab Content Panes */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "impact" && (
          <ImpactTab summary={summary} riverOutlook={riverOutlook} />
        )}
        {activeTab === "villages" && (
          <VillagesTab
            villages={villages}
            selectedZoneId={selectedZoneId}
            onSelectZone={onSelectZone}
            robustCutoffsOnly={robustCutoffsOnly}
            onToggleRobust={onToggleRobust}
          />
        )}
        {activeTab === "routes" && (
          <RoutesTab
            villages={villages}
            selectedZoneId={selectedZoneId}
            onSelectZone={onSelectZone}
            routeData={routeData}
          />
        )}
        {activeTab === "beacons" && (
          <BeaconsTab onSelectZone={onSelectZone} />
        )}
        {activeTab === "alerts" && (
          <AlertsTab villages={villages} selectedZoneId={selectedZoneId} />
        )}
        {activeTab === "whatif" && (
          <WhatIfTab
            scenariosIndex={scenariosIndex}
            activeDelta={activeDelta}
            onSelectDelta={onSelectDelta}
          />
        )}
        {activeTab === "model" && <ModelTab />}
      </div>
    </aside>
  );
}
