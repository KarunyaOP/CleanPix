"use client";

import React, { useState } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, ArrowLeft, History, Sparkles } from "lucide-react";

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 600);
  };

  return (
    <main className="min-h-screen bg-[#0A0B1E] text-[#F8FAFC] flex flex-col items-center justify-center p-6 selection:bg-primary/40 selection:text-white relative overflow-hidden">
      {/* Background Ambient Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full rounded-[28px] bg-[#131A3A]/90 border border-white/12 p-8 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(79,124,255,0.2)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 mb-8">
          <img
            src="/branding/logo/cleanpix-icon.svg"
            alt="CleanPix Icon"
            className="w-10 h-10 object-contain drop-shadow-[0_0_16px_rgba(0,240,255,0.45)]"
          />
          <span className="font-heading font-bold text-2xl text-white tracking-tight">
            Clean<span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">Pix</span>
          </span>
        </div>

        {/* Offline Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/15 border-2 border-red-500/35 flex items-center justify-center text-red-400 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
          <WifiOff size={36} />
        </div>

        {/* Headings */}
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight mb-2">
          You are currently offline
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mb-8">
          CleanPix AI neural processing requires an active internet connection. Please check your Wi-Fi or mobile data connection and try again.
        </p>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full py-3.5 px-4 rounded-btn font-heading font-bold text-sm text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_24px_rgba(79,124,255,0.6)] hover:shadow-[0_0_36px_rgba(79,124,255,0.85)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={15} className={isRetrying ? "animate-spin" : ""} />
            <span>{isRetrying ? "Checking connection..." : "Retry Connection"}</span>
          </button>

          <Link
            href="/history"
            className="w-full py-3 px-4 rounded-btn text-xs font-semibold text-text-secondary hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <History size={14} className="text-accent" />
            <span>View Saved History</span>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-center gap-1.5 text-[11px] text-text-muted">
          <Sparkles size={12} className="text-accent" />
          <span>CleanPix Progressive Web App</span>
        </div>
      </div>
    </main>
  );
}
