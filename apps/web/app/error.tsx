"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[JalDrishti App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-space-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-rose-400">Application Error</span>
          <h1 className="text-3xl font-heading font-extrabold text-white">Telemetry Interrupted</h1>
          <p className="text-sm text-slate-400 leading-relaxed font-mono text-xs p-3 rounded bg-white/5 border border-white/10 break-all">
            {error.message || "An unexpected rendering fault occurred."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button variant="primary" onClick={() => reset()} className="gap-2 text-xs">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
          <Link href="/">
            <Button variant="secondary" className="gap-2 text-xs">
              <Home className="w-4 h-4" /> Mission Control
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
