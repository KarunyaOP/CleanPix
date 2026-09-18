import React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
  glow?: "none" | "primary" | "accent" | "subtle";
}

export const GlassCard: React.FC<GlassCardProps> = ({
  className,
  children,
  interactive = false,
  glow = "none",
  ...props
}) => {
  const glowStyles = {
    none: "",
    primary: "shadow-primary-glow border-primary/40",
    accent: "shadow-accent-glow border-accent/40",
    subtle: "shadow-[0_4px_20px_rgba(79,124,255,0.12)] border-primary/20",
  };

  return (
    <div
      className={cn(
        "rounded-card bg-surface-glass backdrop-blur-xl border border-border-subtle shadow-card-rest",
        "relative overflow-hidden",
        interactive && "transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-card-hover",
        glowStyles[glow],
        className
      )}
      {...props}
    >
      {/* Subtle top edge sheen line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
