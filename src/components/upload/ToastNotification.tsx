"use client";

import React, { useEffect } from "react";
import { CheckCircle2, Sparkles, Copy, Download, AlertCircle, X } from "lucide-react";

export interface ToastData {
  id?: string;
  message: string;
  type?: "success" | "info" | "error" | "hd";
  duration?: number;
}

export interface ToastNotificationProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration || 3500;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case "hd":
        return <Sparkles size={18} className="text-accent animate-pulse" />;
      case "info":
        return <Copy size={18} className="text-primary" />;
      case "error":
        return <AlertCircle size={18} className="text-red-400" />;
      case "success":
      default:
        if (toast.message.toLowerCase().includes("copied")) {
          return <Copy size={18} className="text-status-success" />;
        }
        if (toast.message.toLowerCase().includes("download")) {
          return <Download size={18} className="text-status-success" />;
        }
        if (toast.message.toLowerCase().includes("hd")) {
          return <Sparkles size={18} className="text-accent animate-pulse" />;
        }
        return <CheckCircle2 size={18} className="text-status-success" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case "error":
        return "border-red-500/40 bg-[#1A0D18]/95 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_24px_rgba(239,68,68,0.3)] text-red-100";
      case "hd":
        return "border-cyan-500/40 bg-[#0C1B33]/95 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_30px_rgba(34,211,238,0.35)] text-[#F8FAFC]";
      default:
        return "border-primary/40 bg-[#131A3A]/95 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_30px_rgba(79,124,255,0.3)] text-[#F8FAFC]";
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-200 select-none">
      <div
        className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-[16px] backdrop-blur-2xl border ${getStyles()}`}
        role="alert"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <p className="text-xs sm:text-sm font-semibold tracking-tight">{toast.message}</p>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
