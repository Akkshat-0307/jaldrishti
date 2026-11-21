import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "real" | "derived" | "simulated" | "neutral";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string; label: string }> = {
  real: {
    container: "bg-aurora-400/10 text-aurora-400 border-aurora-400/30",
    dot: "bg-aurora-400 animate-pulse",
    label: "REAL",
  },
  derived: {
    container: "bg-amber-400/10 text-amber-400 border-amber-400/30",
    dot: "bg-amber-400",
    label: "DERIVED",
  },
  simulated: {
    container: "bg-alert-500/10 text-alert-500 border-alert-500/30",
    dot: "bg-alert-500",
    label: "SIMULATED",
  },
  neutral: {
    container: "bg-white/5 text-slate-300 border-white/10",
    dot: "bg-slate-400",
    label: "",
  },
};

export function Badge({
  variant = "neutral",
  children,
  className,
  ...props
}: BadgeProps) {
  const config = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border tracking-wider uppercase",
        config.container,
        className
      )}
      {...props}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {children || config.label}
    </span>
  );
}
