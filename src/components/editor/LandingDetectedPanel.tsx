"use client";

import React from "react";
import { Layers } from "lucide-react";
import { DetectedCategory, SmartBackgroundPreset } from "@/types/schema";
import { getRecommendedPresets, TRANSPARENT_PRESET } from "@/utils/backgroundPresets";

export interface LandingDetectedPanelProps {
  detectedCategory?: DetectedCategory | "other" | string | null;
  activePreset?: SmartBackgroundPreset;
  onSelectPreset?: (preset: SmartBackgroundPreset) => void;
  paddingPercent?: number;
  onPaddingChange?: (padding: number) => void;
}

export const LandingDetectedPanel: React.FC<LandingDetectedPanelProps> = ({
  detectedCategory = "other",
  activePreset = TRANSPARENT_PRESET,
  onSelectPreset,
  paddingPercent = 0,
  onPaddingChange,
}) => {
  const recommendedPresets = getRecommendedPresets((detectedCategory as DetectedCategory) || "other");
  const currentPreset = activePreset || recommendedPresets[0] || TRANSPARENT_PRESET;

  return (
    <div className="w-full rounded-[18px] bg-[#131A3A]/90 backdrop-blur-2xl border border-white/15 p-3 sm:px-4 sm:py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(79,124,255,0.15)] flex flex-col gap-2 select-none animate-in fade-in duration-200">
      {/* Smart Background Recommendations Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold text-text-secondary flex items-center gap-1.5">
            <Layers size={12} className="text-accent" />
            <span>Smart Background Recommendations:</span>
          </span>
        </div>

        {/* Dynamic recommendation chips with color swatch + clear text labels */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none">
          {recommendedPresets.map((preset) => {
            const isSelected = currentPreset.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset && onSelectPreset(preset)}
                title={preset.description || preset.name}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white border border-accent/60 shadow-[0_0_14px_rgba(79,124,255,0.6)] scale-[1.02]"
                    : "bg-white/[0.05] hover:bg-white/10 text-text-secondary hover:text-white border border-white/10"
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full border border-white/30 shrink-0 shadow-sm ${preset.previewBg}`}
                />
                <span className="truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Framing Controls Section: Label and buttons together in one horizontal row */}
      <div className="flex items-center gap-2.5 pt-1.5 border-t border-white/[0.08] text-[11px] sm:text-xs">
        <span className="text-text-secondary font-semibold shrink-0">Framing:</span>
        <div className="flex items-center gap-1 bg-[#0A0B1E]/60 p-0.5 rounded-pill border border-white/10">
          {[
            { label: "Fit (0%)", value: 0 },
            { label: "Balanced (50%)", value: 50 },
            { label: "Spacious (100%)", value: 100 },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPaddingChange && onPaddingChange(option.value)}
              className={`px-2.5 py-1 rounded-pill text-[10.5px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                paddingPercent === option.value
                  ? "bg-primary text-white shadow-[0_0_12px_rgba(79,124,255,0.6)] font-bold scale-[1.02]"
                  : "text-text-secondary hover:text-white hover:bg-white/5"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
