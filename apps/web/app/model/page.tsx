import React from "react";
import Link from "next/link";
import { Cpu, ArrowLeft, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

export default function ModelCardPage() {
  return (
    <main className="min-h-screen bg-space-950 text-foreground selection:bg-aurora-400 selection:text-space-950 pb-20">
      {/* Navigation Top Bar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-space-950/80 border-b border-white/10 px-6 md:px-16 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
          <span className="font-heading font-bold text-lg tracking-wider text-white">
            JAL<span className="text-aurora-400">DRISHTI</span>
          </span>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-xs text-slate-400 uppercase">Model Card (U-Net)</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/about">
            <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white">
              Data &amp; Licenses
            </Button>
          </Link>
          <Link href="/command-center">
            <Button size="sm" className="text-xs">
              Command Center
            </Button>
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-12 space-y-16">
        {/* Page Hero */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-safe-400/10 border border-safe-400/20 text-safe-400 text-xs font-mono font-semibold">
            <Cpu className="w-3.5 h-3.5" />
            <span>MODEL CARD • RESNET34 U-NET</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
            High-Fidelity SAR <br />
            <span className="text-safe-400">Flood Segmentation Model</span>.
          </h1>

          <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed max-w-3xl">
            Trained on Sen1Floods11 hand-labelled ground truth and deployed for cloud-penetrating flood mapping
            across the Barak Basin. Rigorously evaluated with zero synthetic or invented metrics.
          </p>
        </div>

        {/* Section 1: Model Details */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-aurora-400" /> 1. Model Details &amp; Architecture
            </h2>
            <Badge variant="real">PyTorch 2.5</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6 space-y-3">
              <h3 className="font-heading font-semibold text-white">Backbone &amp; Parameters</h3>
              <ul className="text-xs font-mono text-slate-300 space-y-2">
                <li><strong className="text-white">Architecture:</strong> U-Net with ResNet34 encoder</li>
                <li><strong className="text-white">Framework:</strong> segmentation_models_pytorch</li>
                <li><strong className="text-white">Weights:</strong> ImageNet-pretrained encoder initialization</li>
                <li><strong className="text-white">Checkpoint:</strong> `pipeline/weights/unet_resnet34.pth`</li>
                <li><strong className="text-white">Trained Epochs:</strong> 10 epochs (CosineAnnealingLR)</li>
                <li><strong className="text-white">Peak Val IoU:</strong> 0.6405 (64.05% on official validation split)</li>
              </ul>
            </GlassCard>

            <GlassCard className="p-6 space-y-3">
              <h3 className="font-heading font-semibold text-white">Input Channels &amp; Normalization</h3>
              <p className="text-xs font-mono text-slate-300 leading-relaxed">
                3 channels extracted from Sentinel-1 IW GRD SAR:
              </p>
              <ul className="text-xs font-mono text-slate-400 space-y-1 list-disc list-inside">
                <li>Band 0: `VV` polarization in decibels (dB)</li>
                <li>Band 1: `VH` polarization in decibels (dB)</li>
                <li>Band 2: Cross-polarization difference `(VV - VH)` in dB</li>
              </ul>
              <div className="pt-2 text-[11px] font-mono text-slate-400 bg-space-900/60 p-2.5 rounded border border-white/10">
                Normalization computed strictly from train split: <br />
                VV: μ = -9.64 dB, σ = 2.73 dB | VH: μ = -15.97 dB, σ = 3.15 dB
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Section 2: Training & Leakage Prevention */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-aurora-400" /> 2. Data Splits &amp; Leakage Prevention
            </h2>
            <Badge variant="real">Sen1Floods11 v1.1</Badge>
          </div>

          <GlassCard className="p-6 space-y-4 text-xs font-mono text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pb-2 border-b border-white/10 text-center">
              <div className="p-3 rounded bg-space-900 border border-white/10">
                <span className="text-slate-400">TRAIN SPLIT</span>
                <div className="text-xl font-bold text-white mt-1">252 Chips</div>
                <span className="text-[10px] text-slate-400">Model Optimization</span>
              </div>
              <div className="p-3 rounded bg-space-900 border border-white/10">
                <span className="text-slate-400">VALID SPLIT</span>
                <div className="text-xl font-bold text-aurora-400 mt-1">89 Chips</div>
                <span className="text-[10px] text-slate-400">Checkpoint Selection</span>
              </div>
              <div className="p-3 rounded bg-space-900 border border-white/10">
                <span className="text-slate-400">TEST SPLIT</span>
                <div className="text-xl font-bold text-safe-400 mt-1">88 Chips</div>
                <span className="text-[10px] text-slate-400">Held-Out Global Test</span>
              </div>
              <div className="p-3 rounded bg-space-900 border border-white/10">
                <span className="text-slate-400">BOLIVIA SPLIT</span>
                <div className="text-xl font-bold text-amber-400 mt-1">15 Chips</div>
                <span className="text-[10px] text-slate-400">Unseen Continent</span>
              </div>
            </div>

            <p className="leading-relaxed">
              <strong className="text-white">Strict Leakage Boundary:</strong> No test or held-out Bolivia chips
              were ever used during training or checkpoint selection. The loss function ignores `-1` no-data pixels
              using Masked Dice + BCE Loss:
            </p>
            <div className="p-3 bg-space-900/80 rounded border border-white/10 text-center text-aurora-300">
              Loss = 0.5 · BCE(p, y) + 0.5 · Dice(p, y) [masked where y = -1]
            </div>
            <p className="text-[11px] text-slate-400">
              * Test split has 88 valid chips (out of 90 in the catalog, 2 chips were excluded due to missing/corrupted TIFF metadata).
            </p>
          </GlassCard>
        </section>

        {/* Section 3: Empirical Benchmarks Table */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-safe-400" /> 3. Empirical Benchmark &amp; Ablation Evaluation
            </h2>
            <Badge variant="real">metrics.json</Badge>
          </div>

          <GlassCard className="p-6 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/20 text-slate-400">
                    <th className="py-3 px-4">Split</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">IoU (Jaccard)</th>
                    <th className="py-3 px-4">F1-Score</th>
                    <th className="py-3 px-4">Precision</th>
                    <th className="py-3 px-4">Recall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-slate-300">
                  <tr>
                    <td className="py-3 px-4 text-white font-semibold" rowSpan={3}>
                      Test Split (88 chips)
                    </td>
                    <td className="py-3 px-4 text-slate-400">Tier A Baseline (Otsu)</td>
                    <td className="py-3 px-4">0.2168</td>
                    <td className="py-3 px-4">0.3563</td>
                    <td className="py-3 px-4">0.2358</td>
                    <td className="py-3 px-4 text-safe-400">0.7289</td>
                  </tr>
                  <tr className="bg-aurora-400/5">
                    <td className="py-3 px-4 text-aurora-300 font-semibold">U-Net ResNet34 (Raw)</td>
                    <td className="py-3 px-4 text-aurora-400 font-bold">0.6804</td>
                    <td className="py-3 px-4 text-aurora-400 font-bold">0.8098</td>
                    <td className="py-3 px-4 text-safe-400 font-semibold">0.8199</td>
                    <td className="py-3 px-4">0.7999</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-300">U-Net + Postprocessing</td>
                    <td className="py-3 px-4 font-semibold">0.6691</td>
                    <td className="py-3 px-4 font-semibold">0.8018</td>
                    <td className="py-3 px-4">0.7917</td>
                    <td className="py-3 px-4 text-safe-400">0.8121</td>
                  </tr>

                  <tr className="border-t-2 border-white/20">
                    <td className="py-3 px-4 text-white font-semibold" rowSpan={3}>
                      Bolivia Held-Out (15 chips)
                    </td>
                    <td className="py-3 px-4 text-slate-400">Tier A Baseline (Otsu)</td>
                    <td className="py-3 px-4">0.3736</td>
                    <td className="py-3 px-4">0.5440</td>
                    <td className="py-3 px-4">0.3978</td>
                    <td className="py-3 px-4 text-safe-400">0.8599</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-slate-300">U-Net ResNet34 (Raw)</td>
                    <td className="py-3 px-4 font-semibold">0.6879</td>
                    <td className="py-3 px-4 font-semibold">0.8151</td>
                    <td className="py-3 px-4 text-safe-400 font-semibold">0.8590</td>
                    <td className="py-3 px-4">0.7755</td>
                  </tr>
                  <tr className="bg-safe-400/5">
                    <td className="py-3 px-4 text-safe-300 font-semibold">U-Net + Postprocessing</td>
                    <td className="py-3 px-4 text-safe-400 font-bold">0.6917</td>
                    <td className="py-3 px-4 text-safe-400 font-bold">0.8178</td>
                    <td className="py-3 px-4">0.8449</td>
                    <td className="py-3 px-4">0.7923</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </GlassCard>
        </section>

        {/* Section 4: Known Failure Cases */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> 4. Concrete Failure Modes &amp; Mitigations
            </h2>
            <Badge variant="real">Audited</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-5 space-y-2 border-amber-400/30">
              <h3 className="font-heading font-bold text-white text-sm">Radar Shadow in Steep Relief</h3>
              <p className="text-xs font-mono text-slate-400">
                <strong className="text-amber-400">Case:</strong> Bolivia_195474 (IoU = 0.000)
              </p>
              <p className="text-xs text-slate-300">
                Steep mountain slopes cast dark radar shadows that mimic specular water reflection.
                Mitigated in production by excluding pixels with slope &gt; 5° and HAND &gt; 15m.
              </p>
            </GlassCard>

            <GlassCard className="p-5 space-y-2 border-amber-400/30">
              <h3 className="font-heading font-bold text-white text-sm">Smooth Non-Water Surfaces</h3>
              <p className="text-xs font-mono text-slate-400">
                <strong className="text-amber-400">Case:</strong> Bolivia_233925 (IoU = 0.000)
              </p>
              <p className="text-xs text-slate-300">
                Asphalt airport runways and flat compacted dry soils reflect radar pulses away specularly.
                Mitigated by incorporating dual-polarization ratio `(VV - VH)` and permanent built-up masks.
              </p>
            </GlassCard>

            <GlassCard className="p-5 space-y-2 border-amber-400/30">
              <h3 className="font-heading font-bold text-white text-sm">Flooded Canopy &amp; Vegetation</h3>
              <p className="text-xs font-mono text-slate-400">
                <strong className="text-amber-400">Case:</strong> Ghana_141271 (IoU = 0.000)
              </p>
              <p className="text-xs text-slate-300">
                Water beneath dense tree canopies or aquatic reeds creates double-bounce scattering,
                elevating backscatter and hiding standing water from single-date C-band radar.
              </p>
            </GlassCard>
          </div>
        </section>
      </div>
    </main>
  );
}
