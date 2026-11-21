"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

const TECH_STACK = [
  "Sentinel-1 SAR C-band",
  "Next.js 16 App Router",
  "PyTorch 2.5",
  "segmentation_models_pytorch",
  "MapLibre GL JS",
  "deck.gl GeoJsonLayer",
  "NetworkX Graph Analysis",
  "OSMnx Road Topologies",
  "WorldPop Census (100m)",
  "ESA WorldCover 10m",
  "FastAPI",
  "Tailwind CSS v4",
];

export function ProofScene() {
  return (
    <section className="py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-16 border-t border-white/10">
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-safe-400/10 border border-safe-400/20 text-safe-400 text-xs font-mono font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>SCENE 08 / SCIENTIFIC RIGOR</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
          Proof: <br />
          <span className="text-safe-400">Measured Benchmarks &amp; Data Governance</span>.
        </h2>

        <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed">
          Zero invented numbers. Every performance metric is measured against hand-labelled ground truth
          from the Sen1Floods11 benchmark. Every layer across our system is transparently governed and
          badged.
        </p>
      </div>

      {/* Measured Metrics Table */}
      <GlassCard className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-bold text-lg text-white">Empirical Benchmark Results</h3>
            <p className="text-xs font-mono text-slate-400">
              Evaluated on official Sen1Floods11 hand-labelled splits (`metrics.json`)
            </p>
          </div>
          <Link href="/model">
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" /> View Model Card
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/20 text-slate-400">
                <th className="py-3 px-4">Evaluation Split</th>
                <th className="py-3 px-4">Model Architecture</th>
                <th className="py-3 px-4">IoU (Jaccard)</th>
                <th className="py-3 px-4">F1-Score</th>
                <th className="py-3 px-4">Precision</th>
                <th className="py-3 px-4">Recall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-slate-300">
              {/* Test Split */}
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 text-white font-semibold" rowSpan={3}>
                  Test Split <br />
                  <span className="text-[11px] text-slate-400 font-normal">(88 chips)</span>
                </td>
                <td className="py-3 px-4 text-slate-400">Tier A Baseline (Otsu)</td>
                <td className="py-3 px-4">0.2168</td>
                <td className="py-3 px-4">0.3563</td>
                <td className="py-3 px-4">0.2358</td>
                <td className="py-3 px-4 text-safe-400">0.7289</td>
              </tr>
              <tr className="bg-aurora-400/5 hover:bg-aurora-400/10 transition-colors">
                <td className="py-3 px-4 text-aurora-300 font-semibold">U-Net ResNet34 (Raw)</td>
                <td className="py-3 px-4 text-aurora-400 font-bold">0.6804</td>
                <td className="py-3 px-4 text-aurora-400 font-bold">0.8098</td>
                <td className="py-3 px-4 text-safe-400 font-semibold">0.8199</td>
                <td className="py-3 px-4">0.7999</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 text-slate-300">U-Net + Postprocessing</td>
                <td className="py-3 px-4 font-semibold">0.6691</td>
                <td className="py-3 px-4 font-semibold">0.8018</td>
                <td className="py-3 px-4">0.7917</td>
                <td className="py-3 px-4 text-safe-400">0.8121</td>
              </tr>

              {/* Bolivia Split */}
              <tr className="hover:bg-white/5 transition-colors border-t-2 border-white/20">
                <td className="py-3 px-4 text-white font-semibold" rowSpan={3}>
                  Bolivia Held-Out <br />
                  <span className="text-[11px] text-slate-400 font-normal">(15 chips)</span>
                </td>
                <td className="py-3 px-4 text-slate-400">Tier A Baseline (Otsu)</td>
                <td className="py-3 px-4">0.3736</td>
                <td className="py-3 px-4">0.5440</td>
                <td className="py-3 px-4">0.3978</td>
                <td className="py-3 px-4 text-safe-400">0.8599</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="py-3 px-4 text-slate-300">U-Net ResNet34 (Raw)</td>
                <td className="py-3 px-4 font-semibold">0.6879</td>
                <td className="py-3 px-4 font-semibold">0.8151</td>
                <td className="py-3 px-4 text-safe-400 font-semibold">0.8590</td>
                <td className="py-3 px-4">0.7755</td>
              </tr>
              <tr className="bg-safe-400/5 hover:bg-safe-400/10 transition-colors">
                <td className="py-3 px-4 text-safe-300 font-semibold">U-Net + Postprocessing</td>
                <td className="py-3 px-4 text-safe-400 font-bold">0.6917</td>
                <td className="py-3 px-4 text-safe-400 font-bold">0.8178</td>
                <td className="py-3 px-4">0.8449</td>
                <td className="py-3 px-4">0.7923</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[11px] font-mono text-slate-400 leading-normal border-t border-white/10 pt-4">
          * Note: Bolivia held-out split was strictly withheld during training and checkpoint selection
          to evaluate geographic domain transfer. The test split contains 88 valid chips (2 chips in the
          index were excluded due to missing/corrupted TIFF metadata).
        </p>
      </GlassCard>

      {/* Technology Stack Marquee */}
      <div className="space-y-4">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
          Mission-Critical Technology Stack:
        </span>
        <div className="flex flex-wrap gap-2.5">
          {TECH_STACK.map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 rounded-lg bg-space-900 border border-white/10 text-xs font-mono text-slate-300 shadow-sm"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Data Governance Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <GlassCard className="p-5 space-y-2.5 border-safe-400/30">
          <div className="flex items-center gap-2">
            <Badge variant="real">REAL</Badge>
            <span className="font-heading font-semibold text-white">Direct Physical Observation</span>
          </div>
          <p className="text-xs font-body text-slate-300 leading-relaxed">
            Raw Sentinel-1 SAR microwave backscatter, WorldPop census rasters, ESA WorldCover 10m land cover,
            OpenStreetMap road vectors, and JRC surface water occurrence.
          </p>
        </GlassCard>

        <GlassCard className="p-5 space-y-2.5 border-amber-400/30">
          <div className="flex items-center gap-2">
            <Badge variant="derived">DERIVED</Badge>
            <span className="font-heading font-semibold text-white">Algorithmic Inference</span>
          </div>
          <p className="text-xs font-body text-slate-300 leading-relaxed">
            ResNet34 U-Net flood segmentation masks, HAND terrain water-level scenarios, NetworkX topological
            road cut-off graph analysis, and Dijkstra shortest dry routes.
          </p>
        </GlassCard>

        <GlassCard className="p-5 space-y-2.5 border-alert-500/30">
          <div className="flex items-center gap-2">
            <Badge variant="simulated">SIMULATED</Badge>
            <span className="font-heading font-semibold text-white">Operational Simulation</span>
          </div>
          <p className="text-xs font-body text-slate-300 leading-relaxed">
            Satellite short-message delivery channels (NavIC / SMS gateway telemetry) and synthetic rescue
            beacon pings. Never mixed with real-world sensor streams.
          </p>
        </GlassCard>
      </div>
    </section>
  );
}
