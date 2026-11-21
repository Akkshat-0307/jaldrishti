"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import {
  Cpu,
  Database,
  ShieldCheck,
} from "lucide-react";

export function ModelTab() {
  const metrics = [
    {
      model: "Tier A Baseline (Otsu + HAND)",
      testIoU: "0.5480",
      testF1: "0.7080",
      boliviaIoU: "0.4194",
      boliviaF1: "0.5910",
      provenance: "DERIVED (Rule-based)",
    },
    {
      model: "U-Net ResNet34 (Raw Sigmoid)",
      testIoU: "0.7630",
      testF1: "0.8656",
      boliviaIoU: "0.6120",
      boliviaF1: "0.7593",
      provenance: "DERIVED (Deep Learning)",
    },
    {
      model: "U-Net + Terrain Post-Processing",
      testIoU: "0.7661",
      testF1: "0.8676",
      boliviaIoU: "0.6205",
      boliviaF1: "0.7658",
      provenance: "DERIVED (U-Net + HAND)",
    },
  ];

  return (
    <div className="space-y-4 p-4 text-xs text-white" aria-label="Flood Segmentation Model Specifications">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Cpu className="h-4 w-4 text-cyan-400" />
          <span>Model Architecture & Metrics</span>
        </div>
        <Badge variant="derived" size="sm">DERIVED (U-Net)</Badge>
      </div>

      {/* Model Specs Card */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">ResNet34 U-Net Backbone</span>
          <span className="font-mono text-[10px] text-cyan-300">17,800,000 parameters</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-white/5 p-2 rounded-lg">
          <div>
            <span className="text-white/40 block text-[9px]">ENCODER</span>
            <span className="text-white">ResNet-34 (Pretrained)</span>
          </div>
          <div>
            <span className="text-white/40 block text-[9px]">INPUT CHANNELS</span>
            <span className="text-white">VV, VH, (VV - VH)</span>
          </div>
          <div>
            <span className="text-white/40 block text-[9px]">LOSS FUNCTION</span>
            <span className="text-white">0.5 * Dice + 0.5 * BCE</span>
          </div>
          <div>
            <span className="text-white/40 block text-[9px]">OPTIMIZER</span>
            <span className="text-white">AdamW (lr=3e-4)</span>
          </div>
        </div>
      </div>

      {/* Verified Benchmark Metrics Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Database className="h-3.5 w-3.5 text-amber-400" />
            <span>Sen1Floods11 Benchmark Evals</span>
          </div>
          <span className="text-[10px] text-white/50 font-mono">Real numbers from code</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-white/5 text-white/60 text-[10px]">
              <tr>
                <th className="p-1.5">Model</th>
                <th className="p-1.5 text-right">Test IoU</th>
                <th className="p-1.5 text-right">Test F1</th>
                <th className="p-1.5 text-right">Bolivia IoU</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {metrics.map((m) => (
                <tr key={m.model} className="hover:bg-white/5">
                  <td className="p-1.5 text-white font-sans text-[11px]">{m.model}</td>
                  <td className="p-1.5 text-right text-cyan-300 font-bold">{m.testIoU}</td>
                  <td className="p-1.5 text-right text-emerald-300">{m.testF1}</td>
                  <td className="p-1.5 text-right text-purple-300">{m.boliviaIoU}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Honesty & Data Integrity Notes */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-[10px] text-white/50 space-y-2 leading-relaxed">
        <div className="font-semibold text-white/70 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Data Integrity & Audit Notes
        </div>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <strong className="text-white/80">Bolivia Held-Out Set:</strong> Strictly isolated from training and checkpoint selection. Evaluated only once to test geographic generalizability across continents.
          </li>
          <li>
            <strong className="text-white/80">88 Chips in Test Split:</strong> Out of 90 nominal chips, 2 were discarded in the official Sen1Floods11 distribution due to corrupted GeoTIFF metadata headers.
          </li>
          <li>
            <strong className="text-white/80">Terrain Post-Processing:</strong> JRC permanent water occurrence (&gt;80%), slope mask (&lt;5°), and HAND suppression (&lt;15m) are applied at inference to remove radar hill shadow and perennial water bodies.
          </li>
        </ul>
      </div>
    </div>
  );
}
