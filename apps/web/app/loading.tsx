import { Satellite } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-space-950 text-white flex flex-col items-center justify-center p-6 select-none">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <Satellite className="w-6 h-6 text-cyan-400 animate-pulse" />
        </div>
        <div className="text-center space-y-1 font-mono">
          <span className="text-xs text-cyan-300 font-bold uppercase tracking-widest">JalDrishti</span>
          <p className="text-[11px] text-slate-400">Loading satellite telemetry...</p>
        </div>
      </div>
    </div>
  );
}
