"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-rose-400">Critical System Exception</h2>
          <p className="text-xs text-slate-300 font-mono bg-white/5 p-3 rounded border border-white/10 break-all">
            {error.message || "A root layout exception occurred."}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Reset Application
          </button>
        </div>
      </body>
    </html>
  );
}
