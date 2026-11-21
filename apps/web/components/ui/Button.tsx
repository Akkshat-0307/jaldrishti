import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-flood-500 text-white hover:bg-flood-500/90 shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  secondary:
    "bg-space-800 text-foreground border border-white/10 hover:border-aurora-400/40",
  ghost: "text-foreground hover:bg-white/5",
  danger:
    "bg-alert-500 text-white hover:bg-alert-500/90 shadow-[0_0_20px_rgba(244,63,94,0.3)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-10 px-5 text-sm rounded-lg",
  lg: "h-12 px-7 text-base rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-400",
        "disabled:pointer-events-none disabled:opacity-50",
        "cursor-pointer",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
