"use client";

import React, { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FloodMap from "@/components/map/FloodMap";
import { TopBar } from "@/components/command-center/TopBar";
import { KpiStrip } from "@/components/command-center/KpiStrip";
import { LayerPanel } from "@/components/command-center/LayerPanel";
import { TimeScrubber } from "@/components/command-center/TimeScrubber";
import { ZoneDetail } from "@/components/command-center/ZoneDetail";
import { TabDrawer } from "@/components/command-center/TabDrawer";
import { CommandPalette } from "@/components/command-center/CommandPalette";
import { GuidedTour } from "@/components/command-center/GuidedTour";
import { AccessibleDataTable } from "@/components/command-center/AccessibleDataTable";
import type { LayerState } from "@/components/command-center/types";
import {
  useImpactSummary,
  useRiverOutlook,
  useRoutes,
  useTimeline,
  useVillages,
  useWhatIfScenarios,
} from "@/hooks/useEventData";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function CommandCenterPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <CommandCenterContent />
    </QueryClientProvider>
  );
}

function CommandCenterContent() {
  // Query data hooks with static fallback
  const { data: summary } = useImpactSummary();
  const { data: villagesData } = useVillages();
  const { data: routes } = useRoutes();
  const { data: scenariosIndex } = useWhatIfScenarios();
  const { data: riverOutlook } = useRiverOutlook();
  const { data: timeline } = useTimeline();

  const villages = useMemo(() => villagesData?.features ?? [], [villagesData]);

  // UI State
  const [activeTab, setActiveTab] = useState<string>("impact");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [robustCutoffsOnly, setRobustCutoffsOnly] = useState<boolean>(false);
  const [activeDelta, setActiveDelta] = useState<number>(0.0);
  const [activeTimelineDate, setActiveTimelineDate] = useState<string>("2022-06-18");
  const [viewMode, setViewMode] = useState<"map" | "table">("map");
  const [currentLang, setCurrentLang] = useState<string>("en");
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Layer State
  const [layers, setLayers] = useState<LayerState>({
    showUnetFlood: true,
    showTierABaseline: false,
    showSettlements: true,
    showRoads: true,
    showShelters: true,
    showRoutes: true,
    showWhatIf: false,
    showRecession: false,
    showBeacons: true,
    opacityUnet: 70,
    opacityTierA: 70,
    opacityWhatIf: 70,
    opacityRecession: 70,
  });

  const handleChangeLayers = (updated: Partial<LayerState>) => {
    setLayers((prev) => ({ ...prev, ...updated }));
  };

  // Derive route for currently selected zone
  const activeRoute = useMemo(() => {
    if (!selectedZoneId || !routes) return null;
    return routes[selectedZoneId] ?? null;
  }, [selectedZoneId, routes]);

  // Derive selected zone properties
  const selectedZoneProps = useMemo(() => {
    if (!selectedZoneId) return null;
    const feat = villages.find((v) => v.properties.zone_id === selectedZoneId);
    return feat ? feat.properties : null;
  }, [selectedZoneId, villages]);

  // What-If scenario GeoJSON URL and Area
  const whatIfDetails = useMemo(() => {
    if (!scenariosIndex?.scenarios) {
      return { url: null, areaHa: null };
    }
    const match = scenariosIndex.scenarios.find((s) => Math.abs(s.delta_m - activeDelta) < 0.01);
    if (match) {
      return { url: match.geojson_path, areaHa: match.flooded_area_ha };
    }
    return { url: null, areaHa: null };
  }, [scenariosIndex, activeDelta]);

  // Timeline GeoJSON URL based on active timeline date
  const timelineGeojsonUrl = useMemo(() => {
    if (activeTimelineDate === "2022-05-01") return null; // Baseline dry: no flood polygons
    if (activeTimelineDate === "2022-06-30") return "/data/events/assam-2022/flood_polygons_recession.geojson";
    return "/data/events/assam-2022/flood_polygons_unet.geojson"; // Peak flood
  }, [activeTimelineDate]);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-white overflow-hidden select-none font-sans">
      {/* 1. Top Bar */}
      <TopBar
        currentLang={currentLang}
        onSelectLang={setCurrentLang}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onStartTour={() => setIsTourOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* 2. KPI Strip */}
      <KpiStrip
        summary={summary}
        robustCutoffsOnly={robustCutoffsOnly}
        onToggleRobust={() => setRobustCutoffsOnly(!robustCutoffsOnly)}
      />

      {/* 3. Main Workspace Area */}
      {viewMode === "table" ? (
        <AccessibleDataTable
          villages={villages}
          routes={routes}
          onClose={() => setViewMode("map")}
        />
      ) : (
        <div className="flex-1 relative flex overflow-hidden">
          {/* Left Layer Panel */}
          <LayerPanel layers={layers} onChangeLayers={handleChangeLayers} />

          {/* Center Map Canvas */}
          <main className="flex-1 relative h-full w-full" aria-label="Interactive Flood Disaster Map">
            <FloodMap
              initialModel={activeTab === "whatif" ? "whatif" : "unet"}
              selectedZoneId={selectedZoneId}
              onSelectZone={(zid) => {
                setSelectedZoneId(zid);
                if (zid) setActiveTab("villages");
              }}
              routeGeojson={activeRoute?.geojson ?? null}
              whatifGeojsonUrl={whatIfDetails.url}
              whatifAreaHa={whatIfDetails.areaHa}
              robustCutoffsOnly={robustCutoffsOnly}
              timelineGeojsonUrl={timelineGeojsonUrl}
              showBeacons={layers.showBeacons}
            />

            {/* Floating Time Scrubber */}
            <TimeScrubber
              timeline={timeline}
              activeDate={activeTimelineDate}
              onSelectDate={(date) => setActiveTimelineDate(date)}
            />

            {/* Selected Zone Detail Card Overlay */}
            {selectedZoneProps && (
              <div className="absolute right-4 top-4 z-20 w-80 max-w-[calc(100vw-32px)]">
                <ZoneDetail
                  zone={selectedZoneProps}
                  route={activeRoute}
                  onClose={() => setSelectedZoneId(null)}
                  onSelectRoute={() => setActiveTab("routes")}
                />
              </div>
            )}
          </main>

          {/* Right Tabbed Drawer */}
          <TabDrawer
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            summary={summary}
            riverOutlook={riverOutlook}
            villages={villages}
            selectedZoneId={selectedZoneId}
            onSelectZone={(zid) => setSelectedZoneId(zid)}
            robustCutoffsOnly={robustCutoffsOnly}
            onToggleRobust={() => setRobustCutoffsOnly(!robustCutoffsOnly)}
            routeData={activeRoute}
            scenariosIndex={scenariosIndex}
            activeDelta={activeDelta}
            onSelectDelta={setActiveDelta}
          />
        </div>
      )}

      {/* 4. Modals & Overlays */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        villages={villages}
        onSelectZone={(zid) => setSelectedZoneId(zid)}
        onSelectTab={(tab) => setActiveTab(tab)}
        onToggleTableView={() => setViewMode(viewMode === "map" ? "table" : "map")}
        onStartTour={() => setIsTourOpen(true)}
      />

      <GuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
