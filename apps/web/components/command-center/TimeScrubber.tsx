"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { TimelineData, TimelineDateItem } from "./types";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "lucide-react";

interface TimeScrubberProps {
  timeline?: TimelineData | null;
  activeDate: string;
  onSelectDate: (date: string) => void;
}

export function TimeScrubber({ timeline, activeDate, onSelectDate }: TimeScrubberProps) {
  const dates: TimelineDateItem[] = useMemo(() => timeline?.dates ?? [
    {
      date: "2022-05-01",
      label: "Baseline Dry",
      stage: "pre_flood",
      satellite_scene_id: "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234737",
      flooded_area_ha: 0.0,
      flooded_area_km2: 0.0,
      population_exposed: 0,
      polygon_geojson: null,
      status_badge: "REAL (S1 Baseline Dry)",
    },
    {
      date: "2022-06-18",
      label: "Peak Flood",
      stage: "peak",
      satellite_scene_id: "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_053835_0EB8",
      flooded_area_ha: 9976.0,
      flooded_area_km2: 99.76,
      population_exposed: 101986,
      polygon_geojson: "/data/events/assam-2022/flood_polygons_unet.geojson",
      status_badge: "DERIVED (U-Net Peak)",
    },
    {
      date: "2022-06-30",
      label: "Flood Recession",
      stage: "recession",
      satellite_scene_id: "COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220630T234744_20220630T234809_043899_053D9A_3654",
      flooded_area_ha: 4994.68,
      flooded_area_km2: 49.95,
      population_exposed: 83393,
      polygon_geojson: "/data/events/assam-2022/flood_polygons_recession.geojson",
      status_badge: "DERIVED (U-Net Recession)",
    },
  ], [timeline]);

  const [isPlaying, setIsPlaying] = useState(false);
  const currentIndex = Math.max(0, dates.findIndex((d) => d.date === activeDate));
  const currentItem = dates[currentIndex] || dates[1];

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const nextIdx = (currentIndex + 1) % dates.length;
      onSelectDate(dates[nextIdx].date);
    }, 2800);
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, dates, onSelectDate]);

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + dates.length) % dates.length;
    onSelectDate(dates[prevIdx].date);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % dates.length;
    onSelectDate(dates[nextIdx].date);
  };

  return (
    <div
      id="time-scrubber"
      aria-label="Satellite flood timeline scrubber"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-[540px] max-w-full"
    >
      <div className="bg-slate-950/85 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2">
        {/* Controls & Current State Header */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-7 w-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center hover:bg-cyan-500/30 transition-colors"
              title={isPlaying ? "Pause timeline auto-play" : "Play timeline auto-play"}
              aria-label={isPlaying ? "Pause timeline auto-play" : "Play timeline auto-play"}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
            </button>
            <button
              onClick={handlePrev}
              className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
              title="Previous satellite scene"
              aria-label="Previous satellite scene"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10"
              title="Next satellite scene"
              aria-label="Next satellite scene"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="flex flex-col">
              <span className="font-semibold text-white tracking-wide">
                {currentItem.label} ({currentItem.date})
              </span>
              <span className="text-[10px] text-white/50 font-mono">
                {currentItem.flooded_area_ha > 0
                  ? `${currentItem.flooded_area_ha.toLocaleString()} ha (${currentItem.flooded_area_km2} km²)`
                  : "0 ha (Normal conditions)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant={currentItem.stage === "pre_flood" ? "real" : "derived"} size="sm">
              {currentItem.stage === "pre_flood" ? "REAL" : "DERIVED"}
            </Badge>
          </div>
        </div>

        {/* Timeline Track with Clickable Steps */}
        <div className="relative pt-2 pb-1">
          {/* Connecting bar */}
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${(currentIndex / (dates.length - 1)) * 100}%` }}
            />
          </div>

          {/* Stepper buttons */}
          <div className="flex justify-between items-center -mt-2.5">
            {dates.map((d) => {
              const isSelected = d.date === activeDate;
              return (
                <button
                  key={d.date}
                  onClick={() => onSelectDate(d.date)}
                  className="group flex flex-col items-center focus:outline-none"
                  aria-label={`Select date ${d.date} (${d.label})`}
                >
                  <div
                    className={`h-4 w-4 rounded-full border-2 transition-transform duration-200 ${
                      isSelected
                        ? "bg-cyan-400 border-white scale-125 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                        : "bg-slate-900 border-white/40 hover:border-white"
                    }`}
                  />
                  <span
                    className={`text-[10px] mt-1 font-mono transition-colors ${
                      isSelected ? "text-cyan-300 font-semibold" : "text-white/40 group-hover:text-white/70"
                    }`}
                  >
                    {d.date.slice(5)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
