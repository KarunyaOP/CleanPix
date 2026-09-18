"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does CleanPix remove backgrounds automatically?",
      a: "CleanPix utilizes deep-learning semantic segmentation neural networks trained specifically on edge contours, hair strands, and complex object boundaries to isolate the foreground subject and generate pure alpha transparency.",
    },
    {
      q: "What file formats and image sizes are supported?",
      a: "CleanPix supports JPG, JPEG, PNG, and WEBP formats up to 10MB in size and resolutions up to 4K.",
    },
    {
      q: "Does the cutout preserve alpha transparency?",
      a: "Yes, 100%. All downloads are delivered as genuine 32-bit PNGs with true lossless alpha channels, ready for pasting or compositing on any background.",
    },
    {
      q: "What is HD 2x Enhancement?",
      a: "HD Enhancement applies Cloudinary AI super-resolution transformations (DPR 2.0, selective edge sharpening, and auto-best quality optimization) to produce ultra-crisp output tailored for e-commerce listings and high-res marketing prints.",
    },
    {
      q: "How does the Social Media Kit Generator work?",
      a: "With one click, CleanPix renders your transparent cutout into optimal aspect ratios: Instagram Post (1:1), Instagram Story / Reel (9:16), YouTube Thumbnail (16:9), and LinkedIn Profile (1:1) with proportional auto-centering and smart padding.",
    },
    {
      q: "Can I paste an image directly from my clipboard?",
      a: "Yes! Simply press Ctrl + V on desktop anywhere on the page and CleanPix will automatically load and prepare the image for background removal.",
    },
  ];

  return (
    <section id="faq" className="relative py-24 sm:py-32 border-t border-white/[0.08] bg-[#0A0B1E]/60 scroll-mt-20">
      <div className="max-w-[960px] mx-auto px-6 sm:px-10">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-[#131A3A] border border-primary/30 text-xs font-semibold text-accent mb-4">
            <HelpCircle size={13} />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#F8FAFC] tracking-tight mb-4">
            Got Questions? <span className="text-gradient-cyan">We Have Answers</span>
          </h2>
          <p className="text-base text-text-secondary leading-relaxed font-normal">
            Everything you need to know about CleanPix processing, file formats, and features.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-[20px] border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-[#131A3A]/90 border-primary/40 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_20px_rgba(79,124,255,0.15)]"
                    : "bg-[#131A3A]/50 border-white/10 hover:border-white/20 hover:bg-[#131A3A]/70"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 cursor-pointer select-none"
                >
                  <span className="font-heading font-bold text-base sm:text-lg text-white">
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-accent transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 bg-primary/20 text-white" : ""
                    }`}
                  >
                    <ChevronDown size={16} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-text-secondary leading-relaxed border-t border-white/[0.06] animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
