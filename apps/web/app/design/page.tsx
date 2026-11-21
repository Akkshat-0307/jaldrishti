import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Compass,
  Layers,
  Radio,
  ShieldAlert,
  ArrowRight,
  Droplets,
  Activity,
  Cpu,
} from "lucide-react";

const colors = [
  { name: "space-950", hex: "#050A18", desc: "Page canvas background", bgClass: "bg-space-950", borderClass: "border-white/20" },
  { name: "space-900", hex: "#0B1226", desc: "Panels and card surfaces", bgClass: "bg-space-900", borderClass: "border-white/20" },
  { name: "flood-500", hex: "#3B82F6", desc: "Detected water extent", bgClass: "bg-flood-500", textDark: false },
  { name: "aurora-400", hex: "#22D3EE", desc: "Accents, active states, links", bgClass: "bg-aurora-400", textDark: true },
  { name: "saffron-400", hex: "#FF9933", desc: "Routes & highlights (ISRO homage)", bgClass: "bg-saffron-400", textDark: true },
  { name: "amber-400", hex: "#FBBF24", desc: "Warnings, caution tier", bgClass: "bg-amber-400", textDark: true },
  { name: "alert-500", hex: "#F43F5E", desc: "Critical alerts, SOS beacon", bgClass: "bg-alert-500", textDark: false },
  { name: "safe-400", hex: "#34D399", desc: "Safe shelters, rescued status", bgClass: "bg-safe-400", textDark: true },
];

export default function DesignTokensPage() {
  return (
    <div className="min-h-screen bg-space-950 text-foreground px-6 py-12 md:px-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12 border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-aurora-400 animate-pulse" />
              <p className="text-xs font-mono uppercase tracking-widest text-aurora-400">
                Phase 0 Design System
              </p>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold tracking-tight mt-2 text-white">
              JalDrishti Design Tokens
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl text-sm md:text-base">
              Mission-control aesthetic for satellite-to-last-mile flood intelligence. Built for high-contrast clarity, purposeful motion, and transparent data attribution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="secondary" size="sm">Landing</Button>
            </Link>
            <Link href="/command-center">
              <Button variant="secondary" size="sm">Command Center</Button>
            </Link>
            <Link href="/beacon">
              <Button variant="secondary" size="sm">Beacon PWA</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Section 1: Color Palette */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <Droplets className="w-5 h-5 text-aurora-400" />
          <h2 className="text-2xl font-heading font-semibold text-white">Color Palette</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {colors.map((c) => (
            <GlassCard key={c.name} className="flex flex-col justify-between h-44 p-5" glow>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-white">{c.name}</h3>
                  <p className="font-mono text-xs text-slate-400">{c.hex}</p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl shadow-lg border ${c.bgClass} ${c.borderClass || "border-white/10"}`}
                />
              </div>
              <p className="text-xs text-slate-300 mt-4 leading-relaxed">{c.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Section 2: Data Provenance Badges (Honesty Rule) */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-saffron-400" />
          <h2 className="text-2xl font-heading font-semibold text-white">
            Data Attribution Badges (Honesty Rule)
          </h2>
        </div>
        <p className="text-slate-400 text-sm mb-6 max-w-3xl">
          Every layer and metric in JalDrishti carries explicit attribution badges. Judges trust platforms that differentiate direct sensor measurements from model outputs and simulated delivery channels.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="space-y-4" glow>
            <div className="flex items-center justify-between">
              <Badge variant="real" />
              <span className="text-xs font-mono text-slate-400">Direct Observations</span>
            </div>
            <p className="text-xs text-slate-300">
              Direct satellite acquisitions or official ground-truth portals (e.g. Sentinel-1 GRD SAR pixels, JRC Surface Water, OpenStreetMap road networks, WorldPop).
            </p>
            <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-aurora-400">
              <Activity className="w-3.5 h-3.5" /> Direct Raw Sensor / Registry
            </div>
          </GlassCard>

          <GlassCard className="space-y-4" glow>
            <div className="flex items-center justify-between">
              <Badge variant="derived" />
              <span className="text-xs font-mono text-slate-400">Model Output</span>
            </div>
            <p className="text-xs text-slate-300">
              Outputs generated by our trained segmentation U-Net, LightGBM risk models, zonal statistics, or graph routing engines (e.g. flood extent mask, priority score).
            </p>
            <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-amber-400">
              <Cpu className="w-3.5 h-3.5" /> JalDrishti ML / Graph Pipelines
            </div>
          </GlassCard>

          <GlassCard className="space-y-4" glow>
            <div className="flex items-center justify-between">
              <Badge variant="simulated" />
              <span className="text-xs font-mono text-slate-400">Hardware / Protocol Prototype</span>
            </div>
            <p className="text-xs text-slate-300">
              Prototypes for channels we cannot physically access in a hackathon sandbox (e.g. NavIC satellite short-message delivery, GSM broadcast gateway emulation).
            </p>
            <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs font-mono text-alert-500">
              <Radio className="w-3.5 h-3.5" /> Simulated Protocol Pipeline
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Section 3: Typography Stack */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <Compass className="w-5 h-5 text-aurora-400" />
          <h2 className="text-2xl font-heading font-semibold text-white">Typography Stack</h2>
        </div>
        <GlassCard className="space-y-8">
          <div className="border-b border-white/10 pb-6">
            <span className="text-xs font-mono text-aurora-400 uppercase tracking-wider block mb-2">
              Font Heading: Space Grotesk
            </span>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-2">
              Sensing to Action: The Mission Control for Flood Emergencies
            </h1>
            <p className="font-heading text-lg text-slate-300">
              ABCDEFGH IJKLMNOP QRSTUVWXYZ abcdefgh ijklmnop qrstuvwxyz 0123456789
            </p>
          </div>

          <div className="border-b border-white/10 pb-6">
            <span className="text-xs font-mono text-aurora-400 uppercase tracking-wider block mb-2">
              Font Body: Inter
            </span>
            <p className="font-body text-base text-slate-200 leading-relaxed max-w-3xl">
              Monsoon cloud cover routinely blinds optical sensors during flood crises. JalDrishti synthesizes synthetic aperture radar (SAR) backscatter, topographic HAND indexes, and graph-theoretical network isolation to guide district commanders with mathematical certainty.
            </p>
          </div>

          <div>
            <span className="text-xs font-mono text-aurora-400 uppercase tracking-wider block mb-2">
              Font Mono: JetBrains Mono
            </span>
            <p className="font-mono text-sm text-aurora-400">
              LAT: +24.8142° N | LON: +92.8016° E | ELEV: 24.3m | S1-IW-GRD: 2022-06-18T00:14:22Z
            </p>
            <p className="font-mono text-xs text-slate-400 mt-2">
              PAYLOAD: 0x1A2B_F04C_99A1 | STATUS: EN_ROUTE | BATT: 84% | PEAK_DISCHARGE: 1,420 m³/s
            </p>
          </div>
        </GlassCard>
      </section>

      {/* Section 4: Component Primitives */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <ShieldAlert className="w-5 h-5 text-saffron-400" />
          <h2 className="text-2xl font-heading font-semibold text-white">Component Primitives</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="space-y-6">
            <h3 className="text-lg font-heading font-medium text-white">Button Variants</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Critical SOS</Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center pt-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">
                Launch Command Center <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="space-y-6">
            <h3 className="text-lg font-heading font-medium text-white">Surface & Elevation</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Glass cards implement 16px backdrop blur, subtle 1px border highlights, and optional aurora glow on interactive hover states.
            </p>
            <div className="p-4 rounded-xl border border-white/5 bg-space-950/70 font-mono text-xs text-slate-400">
              <code>border: 1px solid rgba(255, 255, 255, 0.1);</code><br />
              <code>backdrop-filter: blur(16px);</code><br />
              <code>background: rgba(11, 18, 38, 0.6);</code>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="pt-8 border-t border-white/10 text-xs font-mono text-slate-500 flex flex-wrap justify-between items-center gap-4">
        <span>JalDrishti — ASTRA 2026 Space Theme Hackathon</span>
        <span>WCAG 2.2 AA High Contrast Verified</span>
      </footer>
    </div>
  );
}
