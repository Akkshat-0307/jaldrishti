"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, Layers, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

interface DateStep {
  id: string;
  date: string;
  label: string;
  sarImage: string;
  overlayImage: string | null;
  extentHa: number;
  status: string;
}

const DATES: DateStep[] = [
  {
    id: "baseline",
    date: "2022-05-01",
    label: "Dry Baseline",
    sarImage: "/assets/landing/s1_baseline.png",
    overlayImage: null,
    extentHa: 0,
    status: "Reference (no flood by definition)",
  },
  {
    id: "peak",
    date: "2022-06-18",
    label: "Flood Peak",
    sarImage: "/assets/landing/s1_peak.png",
    overlayImage: "/assets/landing/flood_overlay_peak.png",
    extentHa: 9976,
    status: "Catastrophic Peak Inundation",
  },
  {
    id: "recession",
    date: "2022-06-30",
    label: "Recession",
    sarImage: "/assets/landing/s1_recession.png",
    overlayImage: "/assets/landing/flood_overlay_recession.png",
    extentHa: 4995,
    status: "Lingering in low-elevation settlement areas (HAND < 3m)",
  },
];

export function DetectScene() {
  const [selectedDateIdx, setSelectedDateIdx] = useState<number>(1); // Default June 18 Peak
  const [showOverlay, setShowOverlay] = useState<boolean>(true);

  const current = DATES[selectedDateIdx];

  return (
    <section className="py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-12 border-t border-white/10">
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-flood-500/10 border border-flood-500/20 text-flood-500 text-xs font-mono font-semibold">
          <Eye className="w-3.5 h-3.5" />
          <span>SCENE 04 / SATELLITE DETECTION</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
          Detect: <br />
          <span className="text-flood-500">Deep Learning Flood Segmentation</span>.
        </h2>

        <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed">
          From raw radar backscatter to crisp water boundaries. Our ResNet34 U-Net segments floodwater
          pixels across multi-temporal Sentinel-1 passes, filtering permanent water and terrain shadows.
        </p>
      </div>

      {/* Main Interactive Viewer & Timeline */}
      <GlassCard className="p-4 md:p-8 space-y-6">
        {/* Timeline Acquisition Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-aurora-400" />
            <span className="text-xs font-mono text-slate-300 uppercase">Sentinel-1 Timeline:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DATES.map((step, idx) => {
              const active = idx === selectedDateIdx;
              return (
                <button
                  key={step.id}
                  onClick={() => setSelectedDateIdx(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                    active
                      ? "bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)] font-bold"
                      : "bg-space-900 text-slate-300 border-white/10 hover:text-white hover:border-white/20"
                  }`}
                >
                  {step.date} ({step.label})
                </button>
              );
            })}
          </div>

          {/* Mask toggle */}
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all border ${
              showOverlay
                ? "bg-aurora-400/20 text-aurora-300 border-aurora-400/40"
                : "bg-space-900 text-slate-400 border-white/10"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>U-Net Mask: {showOverlay ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Real Imagery Display */}
        <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[500px] rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-space-950">
          <Image
            src={current.sarImage}
            alt={`Sentinel-1 SAR scene for ${current.date}`}
            width={676}
            height={556}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {showOverlay && current.overlayImage && (
            <Image
              src={current.overlayImage}
              alt={`U-Net segmented flood water overlay for ${current.date}`}
              width={676}
              height={556}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
            />
          )}

          {/* Acquisition Telemetry Overlay */}
          <div className="absolute bottom-4 left-4 z-10 p-3 rounded-lg bg-space-950/85 backdrop-blur-md border border-white/15 text-xs font-mono space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{current.date}</span>
              <Badge variant="real">REAL SAR</Badge>
              {current.overlayImage && <Badge variant="derived">DERIVED U-NET</Badge>}
            </div>
            <div className="text-slate-300">
              Inundation:{" "}
              <strong className="text-flood-400">
                {current.extentHa > 0 ? `${current.extentHa.toLocaleString()} ha` : "0 ha (Baseline Reference)"}
              </strong>
            </div>
            <div className="text-slate-400 text-[11px]">{current.status}</div>
          </div>
        </div>

        {/* Real Empirical Metrics Grid (From metrics.json) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Measured Benchmark Accuracy (Sen1Floods11 Ground Truth):
            </span>
            <Link href="/model">
              <Button variant="ghost" size="sm" className="text-xs text-aurora-400 hover:text-white gap-1 p-0">
                Full Model Card <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
              <span className="text-xs font-mono text-slate-400">U-NET TEST IOU</span>
              <div className="text-2xl font-mono font-bold text-safe-400">0.6804</div>
              <p className="text-[11px] text-slate-400">88 Hand-Labelled Test Chips</p>
            </div>

            <div className="p-3 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
              <span className="text-xs font-mono text-slate-400">U-NET TEST F1</span>
              <div className="text-2xl font-mono font-bold text-safe-400">0.8098</div>
              <p className="text-[11px] text-slate-400">Precision: 0.8199 | Recall: 0.7999</p>
            </div>

            <div className="p-3 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
              <span className="text-xs font-mono text-slate-400">BOLIVIA HELD-OUT IOU</span>
              <div className="text-2xl font-mono font-bold text-aurora-400">0.6879</div>
              <p className="text-[11px] text-slate-400">Zero-Shot Generalization Split</p>
            </div>

            <div className="p-3 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
              <span className="text-xs font-mono text-slate-400">TIER A BASELINE IOU</span>
              <div className="text-2xl font-mono font-bold text-slate-400">0.2168</div>
              <p className="text-[11px] text-slate-400">Otsu + Change Detection</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
