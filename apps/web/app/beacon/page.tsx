import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { ArrowLeft, Radio, AlertTriangle, WifiOff } from "lucide-react";

export default function BeaconPage() {
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
            Rescue Beacon PWA
          </span>
          <Badge variant="simulated">Domain 4</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/design">
            <Button variant="secondary" size="sm">Design Tokens</Button>
          </Link>
        </div>
      </header>

      <main className="my-auto py-12 flex flex-col items-center text-center max-w-xl mx-auto space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-alert-500/10 border border-alert-500/30 flex items-center justify-center text-alert-500 shadow-[0_0_40px_rgba(244,63,94,0.2)]">
          <Radio className="w-10 h-10 animate-pulse" />
        </div>

        <h1 className="text-3xl md:text-5xl font-heading font-bold text-white">
          Last-Mile Rescue Beacon
        </h1>

        <p className="text-slate-300 text-sm md:text-base leading-relaxed">
          Mobile-first PWA with one-tap SOS, GPS location compression, 16-byte packed payloads, and resilient offline queueing (IndexedDB with background sync and simulated NavIC messaging). Scheduled for full implementation in <strong>Phase 8</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left pt-4">
          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <WifiOff className="w-4 h-4 text-amber-400" />
              <Badge variant="simulated">Offline</Badge>
            </div>
            <p className="font-heading text-sm text-white font-medium">Zero Connectivity Mode</p>
            <p className="text-xs text-slate-400">Holds beacons in local storage, ready for SMS/satellite transmission.</p>
          </GlassCard>

          <GlassCard className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-4 h-4 text-alert-500" />
              <Badge variant="simulated">Safety</Badge>
            </div>
            <p className="font-heading text-sm text-white font-medium">Hold-to-Confirm</p>
            <p className="text-xs text-slate-400">1.5s radial ring fill to prevent accidental distress calls.</p>
          </GlassCard>
        </div>
      </main>

      <footer className="pt-6 border-t border-white/10 text-xs font-mono text-slate-500 text-center">
        JalDrishti Platform • Stub ready for Phase 8 assembly
      </footer>
    </div>
  );
}
