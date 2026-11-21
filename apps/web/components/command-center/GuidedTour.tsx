"use client";

import React, { useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import type { TourStep } from "./types";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "kpi-strip",
    title: "1. Space-Enabled Flood Intelligence",
    description:
      "JalDrishti fuses Copernicus Sentinel-1 Synthetic Aperture Radar (SAR), Copernicus GLO-30 DEM, MERIT-Hydro HAND, and WorldPop to deliver verified, zero-hallucination disaster intelligence.",
    badge: "REAL",
  },
  {
    targetId: "layer-panel",
    title: "2. Sentinel-1 SAR Flood Segmentation",
    description:
      "The U-Net model with ImageNet-pretrained ResNet34 encoder detects 9,976.0 ha of inundation on the 2022-06-18 peak flood scene, refined with JRC permanent water masking and terrain slope filtering.",
    badge: "DERIVED",
  },
  {
    targetId: "villages-tab",
    title: "3. Settlement Impact & Priority Ranking",
    description:
      "20 settlement zones synthesized via Voronoi diagram of OpenStreetMap villages. Zones are ranked by an explainable multi-criteria priority formula balancing exposed population, isolation, and facility density.",
    tabToActivate: "villages",
    badge: "DERIVED",
  },
  {
    targetId: "robust-toggle",
    title: "4. Cut-Off Detection & Window Edge Honesty",
    description:
      "8 zones are identified as hydraulically severed. In compliance with JalDrishti honesty rules, 5 zones touch the study window edge where boundary road truncation may overstate isolation, leaving 3 robust interior cut-offs.",
    tabToActivate: "villages",
    badge: "DERIVED",
  },
  {
    targetId: "routes-tab",
    title: "5. Evacuation Routing & Alternate Paths",
    description:
      "Multi-target Dijkstra routing through the passable road network to 32 safe facilities. Near-duplicate alternate routes (>80% overlap) are rejected. Cut-off zones receive boat/air egress transfer vectors.",
    tabToActivate: "routes",
    badge: "DERIVED",
  },
  {
    targetId: "alerts-tab",
    title: "6. Multi-Channel CAP Alerts & SOS Beacons",
    description:
      "Generates standard Common Alerting Protocol (CAP v1.2) warnings broadcast across simulated SMS, Cell Broadcast, Voice, Satellite, and Radio channels. Ingests offline packet SOS beacons.",
    tabToActivate: "alerts",
    badge: "DERIVED",
  },
  {
    targetId: "whatif-tab",
    title: "7. Hydrologically-Grounded What-If Scenarios",
    description:
      "Rather than a circular spatial ML regressor on uniform rainfall, JalDrishti simulates river stage expansion along MERIT-Hydro HAND channels, calibrated to the area-matched baseline (h* = 1.50m).",
    tabToActivate: "whatif",
    badge: "SIMULATED",
  },
  {
    targetId: "time-scrubber",
    title: "8. Multi-temporal Satellite Timeline",
    description:
      "Interactive scrubber tracking flood evolution across authentic Sentinel-1 scenes: May 1 dry baseline (0 ha), June 18 peak flood (9,976 ha), and June 30 recession (4,995 ha).",
    badge: "DERIVED",
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tabId: string) => void;
}

export function GuidedTour({ isOpen, onClose, onSelectTab }: GuidedTourProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIdx];

  const handleNext = () => {
    if (currentStepIdx < TOUR_STEPS.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      if (TOUR_STEPS[nextIdx].tabToActivate) {
        onSelectTab(TOUR_STEPS[nextIdx].tabToActivate!);
      }
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      if (TOUR_STEPS[prevIdx].tabToActivate) {
        onSelectTab(TOUR_STEPS[prevIdx].tabToActivate!);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Automated Guided Demo Tour"
      className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-4"
    >
      <div className="pointer-events-auto w-full max-w-md bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.25)] p-5 flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              Guided Tour ({currentStepIdx + 1} of {TOUR_STEPS.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentStep.badge && (
              <Badge variant={currentStep.badge.toLowerCase() as BadgeVariant} size="sm">
                {currentStep.badge}
              </Badge>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded text-white/50 hover:text-white"
              aria-label="Exit guided tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-white tracking-tight">
            {currentStep.title}
          </h3>
          <p className="text-xs text-white/70 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${((currentStepIdx + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onClose}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIdx === 0}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 text-xs text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <span>{currentStepIdx === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next"}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
