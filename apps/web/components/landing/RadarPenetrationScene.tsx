"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Radio, CloudRain, Sun, MoveHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";

export function RadarPenetrationScene() {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 to 100
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  const handlePointerDown = () => {
    isDragging.current = true;
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  return (
    <section className="py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-12 border-t border-white/10">
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-aurora-400/10 border border-aurora-400/20 text-aurora-400 text-xs font-mono font-semibold">
          <Radio className="w-3.5 h-3.5" />
          <span>SCENE 03 / RADAR PHYSICS</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
          Seeing Through Clouds: <br />
          <span className="text-aurora-400">Microwaves Pierce The Monsoon</span>.
        </h2>

        <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed">
          Radar operates at centimetre microwave wavelengths (λ = 5.6 cm, C-band). While
          optical satellite instruments are blocked by cloud vapor, radar beams pierce through cloud,
          fog, and torrential rain, day or night.
        </p>
      </div>

      {/* Interactive Split Comparison Card */}
      <GlassCard className="p-4 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-300 uppercase">Interactive Split Viewer:</span>
            <span className="text-xs font-mono text-slate-400">Drag handle or use slider below</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <CloudRain className="w-3.5 h-3.5 text-slate-300" />
              Left: Optical (Clouded)
            </span>
            <span className="text-slate-400">vs</span>
            <span className="inline-flex items-center gap-1.5 text-aurora-300 font-semibold">
              <Sun className="w-3.5 h-3.5 text-aurora-400" />
              Right: Sentinel-1 SAR
            </span>
          </div>
        </div>

        {/* Comparison Image Container */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerUp}
          className="relative w-full aspect-[4/3] sm:aspect-[16/9] max-h-[540px] rounded-xl overflow-hidden select-none cursor-ew-resize border border-white/20 touch-none shadow-2xl"
          role="region"
          aria-label="Optical vs Radar satellite comparison image"
        >
          {/* Base Layer: SAR Radar (Revealed on Right) */}
          <div className="absolute inset-0 w-full h-full">
            <Image
              src="/assets/landing/s1_peak.png"
              alt="Sentinel-1 SAR C-band microwave imagery showing clear river meanders and flooded areas"
              width={676}
              height={556}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Top Right Label */}
            <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-md bg-space-950/80 backdrop-blur-md border border-aurora-400/40 text-xs font-mono text-white flex items-center gap-2">
              <Badge variant="real">REAL</Badge>
              <span>Sentinel-1 SAR (Clear)</span>
            </div>
          </div>

          {/* Top Layer: Optical Monsoon Clouds (Clipped to SliderPos on Left) */}
          <div
            className="absolute inset-0 w-full h-full overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <Image
              src="/assets/landing/optical_cloud.png"
              alt="Optical satellite view showing 100% opaque monsoon cloud cover"
              width={676}
              height={556}
              className="absolute inset-0 w-full h-full object-cover max-w-none"
              style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : "100%" }}
            />
            {/* Top Left Label */}
            <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-md bg-space-950/80 backdrop-blur-md border border-white/20 text-xs font-mono text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Optical Sensor (100% Cloud Deck)</span>
            </div>
          </div>

          {/* Draggable Divider Line & Grip */}
          <div
            className="absolute top-0 bottom-0 z-20 w-0.5 bg-aurora-400 shadow-[0_0_12px_#22D3EE]"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-space-900 border-2 border-aurora-400 shadow-[0_0_16px_rgba(34,211,238,0.5)] flex items-center justify-center text-white">
              <MoveHorizontal className="w-4 h-4 text-aurora-400" />
            </div>
          </div>
        </div>

        {/* Accessible Keyboard Range Slider */}
        <div className="pt-2">
          <label htmlFor="cloud-slider" className="sr-only">
            Cloud Penetration Split Slider
          </label>
          <input
            id="cloud-slider"
            type="range"
            min={0}
            max={100}
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="w-full h-1.5 bg-space-800 rounded-lg appearance-none cursor-pointer accent-aurora-400"
            aria-label="Cloud Penetration Split Position"
          />
        </div>

        {/* Physics Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs font-mono">
          <div className="p-3 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
            <span className="text-aurora-400 font-semibold">WAVELENGTH DYNAMICS</span>
            <p className="text-slate-300">
              C-band (5.405 GHz, λ = 5.6 cm) penetrates cloud droplets (≈ 10 μm) without atmospheric Rayleigh attenuation.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
            <span className="text-safe-400 font-semibold">SPECULAR SCATTERING</span>
            <p className="text-slate-300">
              Calm open floodwater reflects radar pulses forward like a mirror, returning near-zero backscatter (dark pixels) to the antenna.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-space-900/60 border border-white/10 space-y-1">
            <span className="text-amber-400 font-semibold">ALL-WEATHER REVISIT</span>
            <p className="text-slate-300">
              Active illumination means day-or-night capture irrespective of solar angle or thunderstorm intensity.
            </p>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
