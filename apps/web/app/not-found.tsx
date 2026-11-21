import Link from "next/link";
import { ArrowLeft, Home, Satellite } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-space-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-alert-500/10 border border-alert-500/30 flex items-center justify-center mx-auto text-alert-400">
          <Satellite className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-alert-400">Error 404 • Loss of Signal</span>
          <h1 className="text-4xl font-heading font-black tracking-tight text-white">Orbit Not Found</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The requested satellite coordinate or page does not exist or has decayed from orbit.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/">
            <Button variant="primary" className="gap-2 text-xs">
              <Home className="w-4 h-4" /> Return to Mission Control
            </Button>
          </Link>
          <Link href="/command-center">
            <Button variant="secondary" className="gap-2 text-xs">
              <ArrowLeft className="w-4 h-4" /> Command Center
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
