import React from "react";
import { ArrowLeft, History } from "lucide-react";

export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-[#0A0B1E] text-[#F8FAFC] flex flex-col selection:bg-primary/40 selection:text-white">
      {/* Top Header Skeleton */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0B1E]/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <ArrowLeft size={16} />
              <span>Back to Editor</span>
            </div>
            <div className="h-5 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-3 select-none">
              <div className="w-8 h-8 rounded-full bg-white/[0.08] animate-pulse" />
              <div className="w-24 h-5 rounded-md bg-white/[0.08] animate-pulse hidden sm:block" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-24 h-9 rounded-btn bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-10 flex-1 flex flex-col">
        {/* Page Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-pulse">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-accent">
                <History size={15} />
              </div>
              <div className="w-48 h-7 rounded-md bg-white/[0.08]" />
              <div className="w-20 h-5 rounded-pill bg-white/[0.06]" />
            </div>
            <div className="w-72 h-4 rounded-md bg-white/[0.05] mt-1" />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28 h-9 rounded-btn bg-white/[0.06]" />
            <div className="w-32 h-9 rounded-btn bg-primary/20" />
          </div>
        </div>

        {/* Filter & Search Toolbar Skeleton */}
        <div className="p-4 rounded-[20px] bg-[#131A3A]/70 border border-white/10 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-20 h-7 rounded-pill bg-white/[0.06]" />
            ))}
          </div>
          <div className="w-48 h-8 rounded-pill bg-white/[0.06]" />
        </div>

        {/* History Compact Cards Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-[20px] bg-[#131A3A]/80 border border-white/12 p-4 flex flex-col justify-between gap-3.5 shadow-sm animate-pulse"
            >
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-[120px] h-[120px] rounded-[16px] bg-white/[0.06]" />
                <div className="w-28 h-3.5 rounded-md bg-white/[0.08]" />
                <div className="w-16 h-3 rounded-md bg-white/[0.05]" />
              </div>
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
                <div className="flex-1 h-7 rounded-[10px] bg-white/[0.05]" />
                <div className="flex-1 h-7 rounded-[10px] bg-white/[0.05]" />
                <div className="w-7 h-7 rounded-[10px] bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
