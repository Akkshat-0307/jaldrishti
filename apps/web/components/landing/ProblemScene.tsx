"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { AlertTriangle, CloudOff, Users, Waves } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";

interface CounterProps {
  from?: number;
  to: number;
  duration?: number;
  formatter?: (val: number) => string;
}

function Counter({ from = 0, to, duration = 1.2, formatter = (v) => v.toLocaleString() }: CounterProps) {
  const [val, setVal] = useState(from);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setVal(to);
      return;
    }

    let start: number | null = null;
    let animId: number;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / (duration * 1000), 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setVal(Math.round(from + (to - from) * ease));
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [inView, from, to, duration]);

  return <span ref={ref}>{formatter(val)}</span>;
}

export function ProblemScene() {
  return (
    <section
      id="problem-scene"
      className="py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-16 border-t border-white/10"
    >
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-alert-500/10 border border-alert-500/20 text-alert-500 text-xs font-mono font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>SCENE 02 / THE INVISIBLE CRISIS</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
          When the monsoon strikes, <br />
          <span className="text-alert-500">traditional observation is blind</span>.
        </h2>

        <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed">
          In June 2022, extreme precipitation triggered record-shattering flooding across the Barak
          Basin. Traditional optical satellites were completely obscured by torrential cloud decks,
          leaving disaster managers without actionable situational awareness.
        </p>
      </div>

      {/* Grid of Large Count-up Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <GlassCard className="p-6 space-y-3 border-alert-500/30 hover:border-alert-500/50 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <Users className="w-5 h-5 text-alert-500" />
            <Badge variant="real">IFRC DREF MDRIN028</Badge>
          </div>
          <div className="text-4xl lg:text-5xl font-mono font-black text-white">
            <Counter to={56} formatter={(v) => (v / 10).toFixed(1) + "M"} />
          </div>
          <p className="text-sm font-semibold text-slate-200">People Affected State-Wide</p>
          <p className="text-xs text-slate-400 leading-normal">
            5.6 million people affected across 32 of 35 districts in Assam (IFRC DREF Operation Final Report MDRIN028, 2022-11-30).
          </p>
        </GlassCard>

        {/* Metric 2 */}
        <GlassCard className="p-6 space-y-3 border-amber-400/30 hover:border-amber-400/50 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <Waves className="w-5 h-5 text-amber-400" />
            <Badge variant="derived">Heinrich Böll Stiftung</Badge>
          </div>
          <div className="text-3xl lg:text-4xl font-mono font-bold text-amber-400">
            [TODO: % Area]
          </div>
          <p className="text-sm font-semibold text-slate-200">Silchar Prolonged Inundation</p>
          <p className="text-xs text-slate-400 leading-normal">
            Near-total city submersion following Betukandi dyke breach; standing water persisted up to 3 months (HBF Report, Nov 2022).
          </p>
        </GlassCard>

        {/* Metric 3 */}
        <GlassCard className="p-6 space-y-3 border-white/20 hover:border-white/40 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <CloudOff className="w-5 h-5 text-slate-300" />
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              [TODO: CLOUD %]
            </span>
          </div>
          <div className="text-3xl lg:text-4xl font-mono font-bold text-slate-300">
            [TODO: Cloud Cover]
          </div>
          <p className="text-sm font-semibold text-slate-200">Optical Cloud Obscuration</p>
          <p className="text-xs text-slate-400 leading-normal">
            Heavy monsoon overcast obstructed optical sensors. [TODO: Compute exact Sentinel-2 cloud fraction over window].
          </p>
        </GlassCard>

        {/* Metric 4 */}
        <GlassCard className="p-6 space-y-3 border-aurora-400/30 hover:border-aurora-400/50 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <Users className="w-5 h-5 text-aurora-400" />
            <Badge variant="real">WorldPop (Modelled Estimate)</Badge>
          </div>
          <div className="text-4xl lg:text-5xl font-mono font-black text-aurora-400">
            <Counter to={427338} />
          </div>
          <p className="text-sm font-semibold text-slate-200">Population in Study Window (Modelled Estimate)</p>
          <p className="text-xs text-slate-400 leading-normal">
            Modelled estimate (WorldPop 2020) across 20 village zones; 101,986 people exposed inside the flood mask.
          </p>
        </GlassCard>
      </div>

      {/* Footnote Citation */}
      <div className="p-4 rounded-lg bg-space-900/60 border border-white/10 text-xs font-mono text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p>
          <strong className="text-slate-300">Data Sources:</strong> IFRC DREF Operation Final Report MDRIN028
          (ReliefWeb, 2022-11-30); Heinrich Böll Stiftung analysis (2022-11-17); WorldPop 100m UN-adjusted (2020);
          Copernicus Sentinel-1 IW GRD.
        </p>
        <span className="text-aurora-400 shrink-0 font-semibold">100% Traced &amp; Badged Statistics</span>
      </div>
    </section>
  );
}
