"use client";

import React, { useState, useEffect, useRef } from "react";
import { CloudRain, Sliders, AlertCircle, Droplets, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";

interface ScenarioDatum {
  delta: number;
  label: string;
  effectiveStage: number;
  floodedAreaHa: number;
  exposedPop: number;
  cutoffZonesCount: number;
  roadsCutKm: number;
}

const SCENARIOS: ScenarioDatum[] = [
  {
    delta: -1.0,
    label: "-1.0 m",
    effectiveStage: 0.5,
    floodedAreaHa: 5273,
    exposedPop: 62356,
    cutoffZonesCount: 14,
    roadsCutKm: 340,
  },
  {
    delta: -0.5,
    label: "-0.5 m",
    effectiveStage: 1.0,
    floodedAreaHa: 7760,
    exposedPop: 94371,
    cutoffZonesCount: 18,
    roadsCutKm: 447,
  },
  {
    delta: 0.0,
    label: "0.0 m (Peak)",
    effectiveStage: 1.5,
    floodedAreaHa: 10408,
    exposedPop: 128959,
    cutoffZonesCount: 18,
    roadsCutKm: 569,
  },
  {
    delta: 0.5,
    label: "+0.5 m",
    effectiveStage: 2.0,
    floodedAreaHa: 13206,
    exposedPop: 163184,
    cutoffZonesCount: 19,
    roadsCutKm: 684,
  },
  {
    delta: 1.0,
    label: "+1.0 m",
    effectiveStage: 2.5,
    floodedAreaHa: 15690,
    exposedPop: 195527,
    cutoffZonesCount: 19,
    roadsCutKm: 805,
  },
  {
    delta: 2.0,
    label: "+2.0 m",
    effectiveStage: 3.5,
    floodedAreaHa: 20247,
    exposedPop: 248990,
    cutoffZonesCount: 19,
    roadsCutKm: 992,
  },
];

export function PredictScene() {
  const [sliderIdx, setSliderIdx] = useState<number>(2); // Default: 0.0m peak
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Rain Particle Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", handleResize);

    const count = 90;
    const drops = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 15 + 8,
      speed: Math.random() * 6 + 4,
      opacity: Math.random() * 0.4 + 0.15,
    }));

    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(canvas);

    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);
      if (!isVisible) return;

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.4)";
      ctx.lineWidth = 1;

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + d.length);
        ctx.stroke();

        d.y += d.speed;
        d.x -= 0.6; // slight wind slant
        if (d.y > height) {
          d.y = -d.length;
          d.x = Math.random() * (width + 50);
        }
      }
    };
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const cur = SCENARIOS[sliderIdx];

  return (
    <section className="py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-12 border-t border-white/10">
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-mono font-semibold">
          <CloudRain className="w-3.5 h-3.5" />
          <span>SCENE 05 / HYDROLOGIC WHAT-IF</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
          Predict: <br />
          <span className="text-amber-400">Terrain Hydrology &amp; Water-Level What-If</span>.
        </h2>

        <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed">
          Simulating how hypothetical water level fluctuations (Δh ∈ [-1.0m, +2.0m])
          expand inundation, sever transportation corridors, and cut off additional villages using
          MERIT Hydro Height Above Nearest Drainage (HAND).
        </p>
      </div>

      <GlassCard className="relative overflow-hidden p-6 md:p-8 space-y-8">
        {/* Subtle Background Rain Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0"
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-8">
          {/* Mandatory Governance Disclaimer */}
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs font-mono text-slate-300">
              <strong className="text-amber-400">[DERIVED PLANNING AID]</strong> Relative comparison only,
              not a forecast and not calibrated for roads or population. Serves disaster coordinators as an
              interactive topological stress-test tool.
            </div>
          </div>

          {/* Slider Interface */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-aurora-400" />
                <span className="text-xs font-mono text-slate-300 uppercase">
                  Water-Level Stage Anomaly (Δh):
                </span>
              </div>
              <div className="font-mono text-sm">
                Stage:{" "}
                <span className="text-aurora-400 font-bold px-2 py-0.5 rounded bg-space-900 border border-aurora-400/40">
                  {cur.label} (Effective: {cur.effectiveStage.toFixed(1)} m)
                </span>
              </div>
            </div>

            {/* Slider Track */}
            <div className="relative py-2">
              <input
                id="whatif-landing-slider"
                type="range"
                min={0}
                max={SCENARIOS.length - 1}
                step={1}
                value={sliderIdx}
                onChange={(e) => setSliderIdx(Number(e.target.value))}
                className="w-full h-2 bg-space-800 rounded-lg appearance-none cursor-pointer accent-aurora-400"
                aria-label="What-If Water Level Anomaly Slider"
              />

              <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2">
                {SCENARIOS.map((s, idx) => (
                  <button
                    key={s.delta}
                    onClick={() => setSliderIdx(idx)}
                    className={`hover:text-white transition-colors ${
                      idx === sliderIdx ? "text-aurora-400 font-bold" : ""
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Dynamic Scenario Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-space-900/80 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <Droplets className="w-4 h-4 text-flood-400" />
                <Badge variant="derived">HAND</Badge>
              </div>
              <div className="text-3xl font-mono font-bold text-white">
                {cur.floodedAreaHa.toLocaleString()}{" "}
                <span className="text-sm font-normal text-slate-400">ha</span>
              </div>
              <p className="text-xs text-slate-400">Total Inundated Extent</p>
            </div>

            <div className="p-4 rounded-lg bg-space-900/80 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <AlertCircle className="w-4 h-4 text-alert-400" />
                <Badge variant="derived">WorldPop</Badge>
              </div>
              <div className="text-3xl font-mono font-bold text-alert-400">
                {cur.exposedPop.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400">Population Exposed</p>
            </div>

            <div className="p-4 rounded-lg bg-space-900/80 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <MapPin className="w-4 h-4 text-amber-400" />
                <Badge variant="derived">NetworkX</Badge>
              </div>
              <div className="text-3xl font-mono font-bold text-amber-400">
                {cur.cutoffZonesCount} <span className="text-sm text-slate-400">/ 20</span>
              </div>
              <p className="text-xs text-slate-400">Cut-Off Village Zones</p>
            </div>

            <div className="p-4 rounded-lg bg-space-900/80 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <Navigation className="w-4 h-4 text-saffron-400" />
                <Badge variant="derived">OSM Graph</Badge>
              </div>
              <div className="text-3xl font-mono font-bold text-saffron-400">
                {cur.roadsCutKm.toLocaleString()}{" "}
                <span className="text-sm font-normal text-slate-400">km</span>
              </div>
              <p className="text-xs text-slate-400">Roads Potentially Cut</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
