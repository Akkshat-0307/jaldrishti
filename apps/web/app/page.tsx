import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowRight, Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-space-950 text-foreground flex flex-col justify-between px-6 py-12 md:px-16 max-w-7xl mx-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-aurora-400 animate-pulse" />
          <span className="font-heading font-bold text-xl tracking-wider text-white">
            JAL<span className="text-aurora-400">DRISHTI</span>
          </span>
          <Badge variant="real">ASTRA 2026</Badge>
        </div>

        <nav className="flex items-center gap-3">
          <Link href="/design">
            <Button variant="ghost" size="sm">
              Design Tokens
            </Button>
          </Link>
          <Link href="/command-center">
            <Button variant="secondary" size="sm">
              Command Center
            </Button>
          </Link>
          <Link href="/beacon">
            <Button variant="primary" size="sm">
              Beacon PWA
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="my-auto py-16 flex flex-col items-start gap-8 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-space-900 border border-white/10 text-xs font-mono text-slate-300">
          <Activity className="w-3.5 h-3.5 text-aurora-400" />
          <span>Space-Enabled Flood Intelligence Platform</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight text-white leading-tight">
          From satellite pixel <br />
          to <span className="text-aurora-400">last-mile rescue</span>.
        </h1>

        <p className="text-slate-300 text-lg md:text-xl font-body max-w-2xl leading-relaxed">
          SENSE via radar aperture. PREDICT via spatial risk topology. ASSESS cut-off populations. ACT via dry-corridor evacuation routing. REACH with offline rescue beacons.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <Link href="/command-center">
            <Button size="lg" className="gap-2">
              Launch Command Center <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/design">
            <Button variant="secondary" size="lg">
              Explore Design System
            </Button>
          </Link>
        </div>

        {/* Feature Grid preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-8">
          <GlassCard glow className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-aurora-400">01 / SENSE</span>
              <Badge variant="real">Sentinel-1 SAR</Badge>
            </div>
            <h2 className="font-heading font-semibold text-white">All-Weather Detection</h2>
            <p className="text-xs text-slate-400">
              Penetrates dense monsoon cloud covers where optical instruments are blind.
            </p>
          </GlassCard>

          <GlassCard glow className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-amber-400">02 / ASSESS</span>
              <Badge variant="derived">Graph Analysis</Badge>
            </div>
            <h2 className="font-heading font-semibold text-white">Cut-Off Village Metrics</h2>
            <p className="text-xs text-slate-400">
              Identifies road-isolated hamlets cut off from functional shelters or hospitals.
            </p>
          </GlassCard>

          <GlassCard glow className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-alert-500">03 / REACH</span>
              <Badge variant="simulated">NavIC / PWA</Badge>
            </div>
            <h2 className="font-heading font-semibold text-white">Offline Rescue Beacon</h2>
            <p className="text-xs text-slate-400">
              16-byte packed telemetry transmitting critical medical and boat requirements.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-white/10 flex flex-wrap justify-between items-center text-xs font-mono text-slate-500 gap-4 w-full">
        <span>JalDrishti © 2026 • Phase 0 Initialized</span>
        <span>Built with Next.js 16 • Tailwind CSS • FastAPI</span>
      </footer>
    </main>
  );
}
