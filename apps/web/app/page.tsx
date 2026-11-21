import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Preloader } from "@/components/landing/Preloader";
import { SmoothScrollProvider } from "@/components/landing/SmoothScrollProvider";
import { GlobeHero } from "@/components/landing/GlobeHero";
import { ProblemScene } from "@/components/landing/ProblemScene";
import { RadarPenetrationScene } from "@/components/landing/RadarPenetrationScene";
import { DetectScene } from "@/components/landing/DetectScene";
import { PredictScene } from "@/components/landing/PredictScene";
import { AssessScene } from "@/components/landing/AssessScene";
import { ActReachScene } from "@/components/landing/ActReachScene";
import { ProofScene } from "@/components/landing/ProofScene";
import { LaunchScene } from "@/components/landing/LaunchScene";

export default function Home() {
  return (
    <SmoothScrollProvider>
      <main className="min-h-screen bg-space-950 text-foreground selection:bg-aurora-400 selection:text-space-950">
        {/* Scene 0: Preloader (first visit only, skippable) */}
        <Preloader />

        {/* Global Floating Navigation Bar */}
        <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-space-950/75 border-b border-white/10 px-6 md:px-16 py-4 flex items-center justify-between transition-all">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="w-3.5 h-3.5 rounded-full bg-aurora-400 shadow-[0_0_10px_#22D3EE] group-hover:scale-110 transition-transform" />
            <span className="font-heading font-bold text-xl tracking-wider text-white">
              JAL<span className="text-aurora-400">DRISHTI</span>
            </span>
            <Badge variant="real">ASTRA 2026</Badge>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/about" className="hidden sm:inline-flex min-h-[44px] items-center">
              <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white px-3 py-2 min-h-[40px]">
                About &amp; Data
              </Button>
            </Link>
            <Link href="/model" className="hidden sm:inline-flex min-h-[44px] items-center">
              <Button variant="ghost" size="sm" className="text-xs text-slate-300 hover:text-white px-3 py-2 min-h-[40px]">
                Model Card
              </Button>
            </Link>
            <Link href="/command-center" className="inline-flex min-h-[44px] items-center">
              <Button size="sm" className="text-xs font-semibold shadow-[0_0_20px_rgba(34,211,238,0.2)] px-4 py-2 min-h-[40px]">
                Command Center
              </Button>
            </Link>
            <Link href="/beacon" className="inline-flex min-h-[44px] items-center">
              <Button variant="secondary" size="sm" className="text-xs px-3 py-2 min-h-[40px]">
                Beacon PWA
              </Button>
            </Link>
          </nav>
        </header>

        {/* Scene 1: Hero with 3D Globe */}
        <GlobeHero />

        {/* Scene 2: The Problem */}
        <ProblemScene />

        {/* Scene 3: Seeing Through Clouds */}
        <RadarPenetrationScene />

        {/* Scene 4: Detect */}
        <DetectScene />

        {/* Scene 5: Predict */}
        <PredictScene />

        {/* Scene 6: Assess */}
        <AssessScene />

        {/* Scene 7: Act and Reach */}
        <ActReachScene />

        {/* Scene 8: Proof */}
        <ProofScene />

        {/* Scene 9: Launch */}
        <LaunchScene />
      </main>
    </SmoothScrollProvider>
  );
}
