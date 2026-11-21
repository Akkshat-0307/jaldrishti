import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  glow = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-space-900/60 p-6 backdrop-blur-xl shadow-xl transition-all duration-300",
        glow && "hover:border-aurora-400/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
