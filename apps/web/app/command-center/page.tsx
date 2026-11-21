"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  ArrowLeft,
  Layers,
  MapPin,
} from "lucide-react";

// Dynamically import MapLibre component to disable SSR
const FloodMap = dynamic(() => import("@/components/map/FloodMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[650px] rounded-2xl border border-white/10 bg-space-950 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-aurora-400 border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-xs text-slate-400">Loading MapLibre WebGL Canvas...</span>
    </div>
  ),
});

export default function CommandCenterPage() {
  const [activeTab, setActiveTab] = useState<"map" | "metrics" | "manifest">("map");

  return (
    <div className="min-h-screen bg-space-950 text-foreground p-4 md:p-8 flex flex-col justify-between max-w-7xl mx-auto space-y-6">
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between border-b border-white/10 pb-5 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Home
            </Button>
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-aurora-400 animate-pulse" />
            <h1 className="text-white font-heading font-bold text-lg tracking-wide">
              Command Center
            </h1>
          </div>
          <Badge variant="real">Sentinel-1 SAR</Badge>
          <Badge variant="derived">Tier A Baseline</Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-space-900 border border-white/10 text-xs font-mono text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-aurora-400" />
            <span>Assam, India (Cachar / Silchar)</span>
          </div>
          <Link href="/design">
            <Button variant="secondary" size="sm">Design Tokens</Button>
          </Link>
        </div>
      </header>

      {/* KPI Summary Strip (Values directly from data/events/assam-2022/metrics.json) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <GlassCard className="p-4" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Flooded Extent</span>
            <Badge variant="derived" className="text-[10px] py-0 px-1.5">DERIVED</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-aurora-400 mt-2">126.17 km²</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">12,617.5 ha (UTM-46N)</p>
        </GlassCard>

        <GlassCard className="p-4" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Water Polygons</span>
            <Badge variant="derived" className="text-[10px] py-0 px-1.5">DERIVED</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-white mt-2">680</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">&gt; 0.5 ha filter</p>
        </GlassCard>

        <GlassCard className="p-4" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Benchmark IoU</span>
            <Badge variant="real" className="text-[10px] py-0 px-1.5">REAL</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-2">0.4609</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Sen1Floods11 Ground Truth</p>
        </GlassCard>

        <GlassCard className="p-4" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Benchmark F1</span>
            <Badge variant="real" className="text-[10px] py-0 px-1.5">REAL</Badge>
          </div>
          <p className="text-2xl font-mono font-bold text-safe-400 mt-2">0.6310</p>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Precision: 0.497 | Recall: 0.863</p>
        </GlassCard>

        <GlassCard className="p-4 col-span-2 sm:col-span-4 lg:col-span-1" glow>
          <div className="flex justify-between items-start">
            <span className="text-xs font-mono text-slate-400 uppercase">Validation</span>
            <Badge variant="simulated" className="text-[10px] py-0 px-1.5">HONESTY</Badge>
          </div>
          <p className="text-sm font-mono font-semibold text-alert-500 mt-2">UNVALIDATED</p>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
            No official EMS vector reference published for exact bbox.
          </p>
        </GlassCard>
      </section>

      {/* Main Map & Visualizer */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-aurora-400" />
            <h2 className="text-lg font-heading font-semibold text-white">
              Tactical Inundation Map — Cachar (Silchar)
            </h2>
          </div>

          <div className="flex gap-2">
            <Button
              variant={activeTab === "map" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("map")}
            >
              Interactive Map
            </Button>
            <Button
              variant={activeTab === "metrics" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("metrics")}
            >
              Model Metrics
            </Button>
            <Button
              variant={activeTab === "manifest" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("manifest")}
            >
              Scene Manifest
            </Button>
          </div>
        </div>

        {activeTab === "map" && <FloodMap />}

        {activeTab === "metrics" && (
          <GlassCard className="space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-white font-semibold text-sm">
                Sen1Floods11 Benchmark Evaluation (Hand-Labeled Chips)
              </span>
              <Badge variant="real">REAL BENCHMARK</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-slate-400 block">Intersection over Union (IoU)</span>
                <span className="text-lg text-amber-400 font-bold">0.4609</span>
              </div>
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-slate-400 block">F1-Score</span>
                <span className="text-lg text-safe-400 font-bold">0.6310</span>
              </div>
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-slate-400 block">Precision</span>
                <span className="text-lg text-white font-bold">0.4971</span>
              </div>
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-slate-400 block">Recall</span>
                <span className="text-lg text-white font-bold">0.8634</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-slate-400 block mb-1">Confusion Matrix (Valid Pixels):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-space-950 border border-white/5">
                  <span className="text-slate-500">True Positives: </span>
                  <span className="text-white font-bold">307,436</span>
                </div>
                <div className="p-2 rounded bg-space-950 border border-white/5">
                  <span className="text-slate-500">False Positives: </span>
                  <span className="text-white font-bold">310,977</span>
                </div>
                <div className="p-2 rounded bg-space-950 border border-white/5">
                  <span className="text-slate-500">False Negatives: </span>
                  <span className="text-white font-bold">48,631</span>
                </div>
                <div className="p-2 rounded bg-space-950 border border-white/5">
                  <span className="text-slate-500">True Negatives: </span>
                  <span className="text-white font-bold">1,106,187</span>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {activeTab === "manifest" && (
          <GlassCard className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-white font-semibold text-sm">
                Authentic Earth Engine Scene Records
              </span>
              <Badge variant="real">COPERNICUS/S1_GRD</Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-aurora-400 font-semibold">[Cachar/Silchar Flood Peak]</span>
                <p className="text-slate-300 select-all">COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220618T234743_20220618T234808_043724_05385D_E87E</p>
                <span className="text-slate-500">Date: 2022-06-18T23:47:43Z | Rel Orbit: 77 | Pass: DESCENDING | Mode: IW (VV+VH)</span>
              </div>
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-slate-400 font-semibold">[Cachar/Silchar Dry Baseline]</span>
                <p className="text-slate-300 select-all">COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220501T234740_20220501T234805_043024_05231C_1E38</p>
                <span className="text-slate-500">Date: 2022-05-01T23:47:40Z | Rel Orbit: 77 | Pass: DESCENDING | Mode: IW (VV+VH)</span>
              </div>
              <div className="p-3 rounded bg-white/5 border border-white/10">
                <span className="text-amber-400 font-semibold">[Cachar/Silchar Flood Recession]</span>
                <p className="text-slate-300 select-all">COPERNICUS/S1_GRD/S1A_IW_GRDH_1SDV_20220630T234744_20220630T234809_043899_053D9A_3654</p>
                <span className="text-slate-500">Date: 2022-06-30T23:47:44Z | Rel Orbit: 77 | Pass: DESCENDING | Mode: IW (VV+VH)</span>
              </div>
            </div>
          </GlassCard>
        )}
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-white/10 text-xs font-mono text-slate-500 flex flex-wrap justify-between items-center gap-4">
        <span>JalDrishti Platform • Phase 1 Tier A Baseline</span>
        <span>Honesty Rule: All numbers derived from Earth Engine pixels & Sen1Floods11 ground truth</span>
      </footer>
    </div>
  );
}
