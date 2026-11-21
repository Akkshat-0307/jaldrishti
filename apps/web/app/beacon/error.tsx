"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function BeaconError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-space-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-heading font-bold text-white">Rescue Beacon Offline</h2>
        <p className="text-xs text-slate-400 font-mono bg-white/5 p-3 rounded border border-white/10 break-all">
          {error.message || "Beacon initialization error."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="sm" onClick={() => reset()} className="gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
          <Link href="/">
            <Button variant="secondary" size="sm" className="gap-2 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
