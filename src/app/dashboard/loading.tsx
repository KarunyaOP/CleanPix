import React from "react";
import { ArrowLeft } from "lucide-react";

export default function DashboardLoading() {
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
            <div className="w-28 h-9 rounded-btn bg-primary/20 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Dashboard Body Skeleton */}
      <main className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-10 flex-1 flex flex-col gap-8">
        {/* User Profile / Welcome Section Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-[22px] bg-[#131A3A]/80 border border-white/10 shadow-sm animate-pulse">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/[0.08] shrink-0" />
            <div className="flex flex-col gap-2 min-w-0">
              <div className="w-48 sm:w-64 h-6 rounded-md bg-white/[0.08]" />
              <div className="w-36 sm:w-44 h-4 rounded-md bg-white/[0.05]" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-9 rounded-btn bg-white/[0.06]" />
            <div className="w-32 h-9 rounded-btn bg-white/[0.06]" />
          </div>
        </div>

        {/* 3 Metric Cards Skeletons */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[20px] bg-[#131A3A]/70 border border-white/10 p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-sm animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="w-28 h-4 rounded-md bg-white/[0.08]" />
                <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
              </div>
              <div className="space-y-2">
                <div className="w-20 h-9 rounded-md bg-white/[0.08]" />
                <div className="w-36 h-3.5 rounded-md bg-white/[0.05]" />
              </div>
            </div>
          ))}
        </section>

        {/* Quick Actions Skeletons */}
        <section className="space-y-3.5">
          <div className="w-32 h-5 rounded-md bg-white/[0.08] animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[18px] bg-[#131A3A]/70 border border-white/10 p-4 sm:p-5 flex items-center justify-between animate-pulse"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-[12px] bg-white/[0.08] shrink-0" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-4 rounded-md bg-white/[0.08]" />
                    <div className="w-36 h-3 rounded-md bg-white/[0.05]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity Skeleton */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="w-36 h-5 rounded-md bg-white/[0.08] animate-pulse" />
            <div className="w-24 h-4 rounded-md bg-white/[0.06] animate-pulse" />
          </div>
          <div className="rounded-[20px] bg-[#131A3A]/70 border border-white/10 overflow-hidden divide-y divide-white/[0.06]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 sm:p-4.5 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-[10px] bg-white/[0.08] shrink-0" />
                  <div className="space-y-1.5">
                    <div className="w-40 sm:w-56 h-4 rounded-md bg-white/[0.08]" />
                    <div className="w-24 h-3 rounded-md bg-white/[0.05]" />
                  </div>
                </div>
                <div className="w-20 h-7 rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
