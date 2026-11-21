import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowLeft, Layers, Compass, Sliders, Shield } from "lucide-react";

export default function CommandCenterPage() {
  return (
    <div className="min-h-screen bg-space-950 text-foreground p-6 md:p-10 flex flex-col justify-between max-w-7xl mx-auto">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Home
            </Button>
          </Link>
          <span className="text-white font-heading font-semibold text-lg">
            Command Center
          </span>
          <Badge variant="derived">Phase 6 Workhorse</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/design">
            <Button variant="secondary" size="sm">Design Tokens</Button>
          </Link>
        </div>
      </header>

      <main className="my-auto py-12 flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-space-900 border border-white/10 flex items-center justify-center text-aurora-400 shadow-2xl">
          <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: "12s" }} />
        </div>
        
        <h1 className="text-3xl md:text-5xl font-heading font-bold text-white">
          Tactical Command Center
        </h1>
        
        <p className="text-slate-300 text-sm md:text-base leading-relaxed">
          The operational workspace for district disaster management commanders. Scheduled for full interactive implementation in <strong>Phase 6</strong> with MapLibre, deck.gl SAR rasters, cut-off village drawer, and real-time dispatch routing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left pt-4">
          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Layers className="w-4 h-4 text-aurora-400" />
              <Badge variant="real">Data</Badge>
            </div>
            <p className="font-heading text-sm text-white font-medium">SAR Raster Layers</p>
            <p className="text-xs text-slate-400">XYZ tiles of Sentinel-1 backscatter & thresholded flood extents.</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Sliders className="w-4 h-4 text-amber-400" />
              <Badge variant="derived">Analysis</Badge>
            </div>
            <p className="font-heading text-sm text-white font-medium">What-If Rain Slider</p>
            <p className="text-xs text-slate-400">Blended risk susceptibility scenarios from 0 to +150mm rainfall.</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <Shield className="w-4 h-4 text-safe-400" />
              <Badge variant="derived">Routing</Badge>
            </div>
            <p className="font-heading text-sm text-white font-medium">Dry Corridors</p>
            <p className="text-xs text-slate-400">OSM road network paths penalised by inundation polygons.</p>
          </GlassCard>
        </div>
      </main>

      <footer className="pt-6 border-t border-white/10 text-xs font-mono text-slate-500 text-center">
        JalDrishti Platform • Stub ready for Phase 6 assembly
      </footer>
    </div>
  );
}
