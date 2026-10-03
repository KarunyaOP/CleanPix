"use client";

import React from "react";
import { Palette } from "lucide-react";
import { DetectedCategory, SmartBackgroundPreset } from "@/types/schema";
import { getRecommendedPresets } from "@/utils/backgroundPresets";

export interface SmartBackgroundSelectorProps {
  detectedCategory?: DetectedCategory | null;
  activePresetId: string;
  onSelectPreset: (preset: SmartBackgroundPreset) => void;
  className?: string;
}

export const SmartBackgroundSelector: React.FC<SmartBackgroundSelectorProps> = ({
  detectedCategory = "other",
  activePresetId,
  onSelectPreset,
  className = "",
}) => {
  const presets = getRecommendedPresets(detectedCategory);

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {/* Background Presets Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Palette size={13} className="text-accent" />
          <span>Background Presets</span>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {presets.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              title={preset.description || preset.name}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-pill text-xs font-medium transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-primary text-white border border-accent shadow-[0_0_14px_rgba(79,124,255,0.6)] scale-105"
                  : "bg-white/[0.04] hover:bg-white/10 text-text-secondary hover:text-white border border-white/10"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border border-white/20 shrink-0 ${preset.previewBg}`}
              />
              <span className="truncate">{preset.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
