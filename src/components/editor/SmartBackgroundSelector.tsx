"use client";

import React from "react";
import { Sparkles, User, ShoppingBag, Dog, Car, Utensils, FileText, Shield, Monitor, Palette } from "lucide-react";
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

  const getCategoryIcon = (cat?: DetectedCategory | null) => {
    switch (cat) {
      case "person":
        return <User size={13} className="text-accent" />;
      case "product":
        return <ShoppingBag size={13} className="text-accent" />;
      case "pet":
        return <Dog size={13} className="text-accent" />;
      case "vehicle":
        return <Car size={13} className="text-accent" />;
      case "food":
        return <Utensils size={13} className="text-accent" />;
      case "document":
        return <FileText size={13} className="text-accent" />;
      case "logo":
        return <Shield size={13} className="text-accent" />;
      case "screenshot":
        return <Monitor size={13} className="text-accent" />;
      case "illustration":
        return <Palette size={13} className="text-accent" />;
      default:
        return <Sparkles size={13} className="text-accent" />;
    }
  };

  const formatCategoryName = (cat?: DetectedCategory | null) => {
    if (!cat) return "Object";
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-[#131A3A] border border-primary/30 text-xs font-semibold text-text-secondary">
          {getCategoryIcon(detectedCategory)}
          <span>
            Detected: <strong className="text-white">{formatCategoryName(detectedCategory)}</strong>
          </span>
        </div>
        <span className="text-[11px] text-text-muted font-medium">
          Smart Recommendations
        </span>
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
