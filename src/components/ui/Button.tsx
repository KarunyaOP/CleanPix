import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "secondary" | "outline" | "gradient-glow";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, icon, iconPosition = "left", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none";

    const sizeStyles = {
      sm: "h-9 px-3.5 text-xs rounded-chip gap-1.5",
      md: "h-11 px-5 text-sm rounded-btn gap-2",
      lg: "h-13 px-7 text-base rounded-btn gap-2.5 font-semibold",
    };

    const variantStyles = {
      primary: "bg-brand-gradient text-white shadow-primary-glow hover:shadow-[0_0_32px_rgba(79,124,255,0.6)] hover:-translate-y-0.5 active:translate-y-0",
      "gradient-glow": "bg-brand-gradient text-white shadow-primary-glow hover:shadow-[0_0_36px_rgba(79,124,255,0.7)] hover:-translate-y-0.5 active:translate-y-0",
      ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/[0.06] border border-transparent active:bg-white/[0.08]",
      outline: "bg-transparent text-text-primary border border-white/15 hover:border-white/30 hover:bg-white/[0.04] active:bg-white/[0.08]",
      secondary: "bg-surface-elevated text-text-primary border border-white/10 hover:border-primary/40 hover:bg-surface-elevated/90 hover:shadow-card-rest",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {icon && iconPosition === "left" && <span className="flex items-center">{icon}</span>}
        <span>{children}</span>
        {icon && iconPosition === "right" && <span className="flex items-center">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
