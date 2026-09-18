"use client";

import React from "react";
import { UploadCloud, Sparkles, Download, ArrowRight } from "lucide-react";

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: "01",
      icon: UploadCloud,
      title: "Upload or Paste",
      description: "Drag and drop your image, browse from your device, or press Ctrl + V to paste straight from your clipboard.",
    },
    {
      step: "02",
      icon: Sparkles,
      title: "AI Erases Background",
      description: "Our neural network detects the subject, isolates complex edges, and removes the background with surgical precision.",
    },
    {
      step: "03",
      icon: Download,
      title: "Export & Create",
      description: "Download in lossless Standard or 2x HD, copy transparent PNG, or generate a complete Social Media Kit in 1 click.",
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 border-t border-white/[0.08] bg-[#0A0B1E]/60 scroll-mt-20">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <span className="text-xs font-bold uppercase tracking-widest text-accent mb-3">
            Workflow Made Simple
          </span>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#F8FAFC] tracking-tight mb-4">
            How CleanPix Works in <span className="text-gradient-cyan">3 Steps</span>
          </h2>
          <p className="text-base text-text-secondary leading-relaxed font-normal">
            No design background required. CleanPix delivers studio-grade cutouts in under 3 seconds.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-[24px] bg-[#131A3A]/75 border border-white/10 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col justify-between group hover:border-primary/50 transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-heading font-black text-3xl text-primary/40 group-hover:text-accent transition-colors">
                      {item.step}
                    </span>
                    <div className="w-12 h-12 rounded-[14px] bg-primary/20 border border-primary/30 flex items-center justify-center text-accent shadow-[0_0_16px_rgba(79,124,255,0.3)]">
                      <Icon size={22} />
                    </div>
                  </div>

                  <h3 className="text-xl font-heading font-bold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
