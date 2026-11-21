"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CommandCenterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-heading font-bold text-white">Command Center Feed Interrupted</h2>
        <p className="text-xs text-slate-400 font-mono bg-white/5 p-3 rounded border border-white/10 break-all">
          {error.message || "Failed to render GIS layers or telemetry feeds."}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="sm" onClick={() => reset()} className="gap-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Reconnect
          </Button>
          <Link href="/">
            <Button variant="secondary" size="sm" className="gap-2 text-xs">
              <Home className="w-3.5 h-3.5" /> Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
