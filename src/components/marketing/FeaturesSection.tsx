"use client";

import React from "react";
import { Zap, Sparkles, Sliders, Smartphone, Lock, ShieldCheck, Download, Share2 } from "lucide-react";

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Sparkles,
      title: "AI Edge Precision",
      description: "Intelligent hair, fur, and delicate contour isolation with zero manual mask editing.",
      badge: "AI Powered",
    },
    {
      icon: Zap,
      title: "HD 2x Enhancement",
      description: "One-click super-resolution sharpening with optimal auto-quality compression.",
      badge: "Lossless",
    },
    {
      icon: Smartphone,
      title: "1-Click Social Media Kit",
      description: "Instant export for Instagram Posts, Stories, YouTube Thumbnails, and LinkedIn Profiles.",
      badge: "Instant Kit",
    },
    {
      icon: Share2,
      title: "Direct Clipboard Copy",
      description: "Paste transparent cutouts directly into Canva, Photoshop, WhatsApp, and PowerPoint.",
      badge: "Productivity",
    },
    {
      icon: Lock,
      title: "Privacy-First Security",
      description: "Server-side TLS encryption. Uploads are strictly processed and never shared publicly.",
      badge: "Secure",
    },
    {
      icon: Sliders,
      title: "Smart Auto-Framing",
      description: "Proportional subject centering and smart padding for polished e-commerce and catalog shots.",
      badge: "Pro Framing",
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32 border-t border-white/[0.08] overflow-hidden scroll-mt-20">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-[#131A3A] border border-primary/30 text-xs font-semibold text-accent mb-4 shadow-[0_0_15px_rgba(79,124,255,0.2)]">
            <Sparkles size={13} />
            <span>Built for Creators & E-commerce</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#F8FAFC] tracking-tight mb-4">
            Everything You Need for <span className="text-gradient-cyan">Flawless Cutouts</span>
          </h2>
          <p className="text-base sm:text-lg text-text-secondary leading-relaxed font-normal">
            CleanPix turns raw product photos and portraits into production-ready assets in milliseconds.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-[22px] bg-[#131A3A]/70 hover:bg-[#1B2350]/80 border border-white/10 hover:border-primary/50 p-7 sm:p-8 transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_16px_40px_rgba(79,124,255,0.25)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-[14px] bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:text-accent group-hover:border-accent/50 group-hover:scale-110 transition-all duration-200 shadow-[0_0_15px_rgba(79,124,255,0.25)]">
                      <Icon size={22} />
                    </div>
                    <span className="px-2.5 py-1 rounded-pill bg-white/[0.06] border border-white/10 text-[10px] font-bold text-text-secondary group-hover:text-accent group-hover:border-accent/30 transition-colors">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-heading font-bold text-white mb-2 group-hover:text-[#F8FAFC] transition-colors">
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
