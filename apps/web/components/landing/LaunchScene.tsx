"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LaunchScene() {
  return (
    <section className="py-24 px-6 md:px-16 max-w-7xl mx-auto space-y-16 border-t border-white/10">
      {/* Aurora Gradient Box */}
      <div className="relative rounded-3xl overflow-hidden p-8 sm:p-14 border border-aurora-400/30 bg-gradient-to-br from-aurora-500/15 via-flood-600/10 to-space-950 shadow-[0_0_80px_rgba(34,211,238,0.15)] text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-aurora-400/10 border border-aurora-400/30 text-aurora-300 text-xs font-mono font-semibold">
          <Radio className="w-3.5 h-3.5 text-aurora-400 animate-pulse" />
          <span>ASTRA 2026 SPACE HACKATHON MISSION CONTROL</span>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-5xl font-heading font-extrabold text-white tracking-tight">
            From Satellite Pixel <br />
            <span className="text-aurora-400">To Life-Saving Rescue</span>.
          </h2>

          <p className="text-slate-300 text-base md:text-lg font-body leading-relaxed">
            Experience mission control: interactive MapLibre &amp; Deck.gl spatial layers, topological
            village isolation metrics, multi-target dry evacuation routing, and offline beacon telemetry.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link href="/command-center">
            <Button
              size="lg"
              className="gap-2.5 px-8 py-6 text-base font-semibold shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:shadow-[0_0_50px_rgba(34,211,238,0.5)] transition-all"
            >
              Launch Command Center <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>

          <Link href="/beacon">
            <Button variant="secondary" size="lg" className="gap-2.5 px-8 py-6 text-base">
              Open Beacon PWA
            </Button>
          </Link>
        </div>

        {/* Quick Nav Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs font-mono text-slate-300">
          <Link href="/model" className="p-2 hover:text-aurora-300 transition-colors">
            Model Card (U-Net) →
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="/about" className="p-2 hover:text-aurora-300 transition-colors">
            Data Sources &amp; Licenses →
          </Link>
          <span className="text-slate-500">•</span>
          <Link href="/design" className="p-2 hover:text-aurora-300 transition-colors">
            Design Tokens Preview →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-300 gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-safe-400" />
          <span className="text-white font-semibold">JalDrishti</span>
          <span>© 2026 • Built for ASTRA 2026 (Theme: Space)</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-slate-300">
          <Link href="/about" className="min-h-[44px] inline-flex items-center hover:text-white transition-colors">
            Attributions &amp; Methodology
          </Link>
          <span className="text-slate-400">•</span>
          <Link href="/model" className="min-h-[44px] inline-flex items-center hover:text-white transition-colors">
            Model Card
          </Link>
          <span className="text-slate-400">•</span>
          <span className="min-h-[44px] inline-flex items-center">Zero-Network DEMO_MODE=1 Capable</span>
        </div>
      </footer>
    </section>
  );
}
