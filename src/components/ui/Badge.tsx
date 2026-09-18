import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "gradient" | "success" | "outline";
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "glass",
  children,
  icon,
  ...props
}) => {
  const baseStyles = "inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-medium tracking-wide transition-colors";

  const variantStyles = {
    glass: "bg-surface-glass border border-white/10 text-text-secondary shadow-sm backdrop-blur-md",
    gradient: "bg-surface-elevated/80 border border-primary/30 text-white shadow-[0_0_12px_rgba(79,124,255,0.25)]",
    success: "bg-status-success/15 border border-status-success/30 text-status-success font-semibold shadow-[0_0_12px_rgba(34,197,94,0.2)]",
    outline: "bg-transparent border border-white/15 text-text-secondary",
  };

  return (
    <div className={cn(baseStyles, variantStyles[variant], className)} {...props}>
      {icon && <span className="flex items-center text-accent">{icon}</span>}
      <span>{children}</span>
    </div>
  );
};
