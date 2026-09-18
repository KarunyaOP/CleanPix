"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, Sparkles, Layers } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0A0B1E] flex flex-col items-center justify-center px-4 sm:px-6 py-16 relative select-none overflow-hidden text-center">
      {/* Ambient Lighting Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#00F0FF]/15 blur-[140px]" />
        <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] rounded-full bg-[#8B5CF6]/15 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#05060F_90%)] opacity-80" />
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[500px] rounded-[32px] bg-[#131A3A]/90 backdrop-blur-2xl border border-primary/35 p-8 sm:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(79,124,255,0.2)] flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon */}
        <Link href="/" className="group flex items-center justify-center">
          <div className="relative w-16 h-16 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
            <img
              src="/branding/logo/cleanpix-icon.svg"
              alt="CleanPix Icon"
              className="w-16 h-16 object-contain drop-shadow-[0_0_24px_rgba(0,240,255,0.55)]"
            />
          </div>
        </Link>

        {/* 404 Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-primary/20 border border-primary/40 text-xs font-extrabold text-accent tracking-wider uppercase">
          <Sparkles size={13} className="text-accent" />
          <span>Error 404</span>
        </div>

        {/* Headings */}
        <div>
          <h1 className="font-heading font-black text-5xl sm:text-6xl text-white tracking-tight mb-2">
            40<span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">4</span>
          </h1>
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
            Page Not Found
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-2 max-w-sm leading-relaxed">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:flex-1 py-3.5 px-4 rounded-btn font-heading font-bold text-sm text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_24px_rgba(79,124,255,0.6)] hover:shadow-[0_0_36px_rgba(79,124,255,0.85)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home size={16} />
            <span>Back to Home</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:flex-1 py-3.5 px-4 rounded-btn font-heading font-bold text-sm text-[#F8FAFC] bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-primary/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Layers size={16} className="text-accent" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Footnote */}
        <p className="text-[11px] text-text-muted">
          CleanPix AI Background Removal • 100% Automated
        </p>
      </div>
    </main>
  );
}
