"use client";

import React from "react";
import {
  Check,
  Sliders,
  Layers,
  ShoppingBag,
  User,
  Dog,
  Car,
  Sparkles,
  Utensils,
  FileText,
  Shield,
  Monitor,
  Palette,
} from "lucide-react";
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
  const getCategoryDetails = (cat?: string | null) => {
    switch (cat) {
      case "person":
        return { label: "PERSON", icon: User };
      case "product":
        return { label: "PRODUCT", icon: ShoppingBag };
      case "pet":
        return { label: "PET", icon: Dog };
      case "vehicle":
        return { label: "VEHICLE", icon: Car };
      case "food":
        return { label: "FOOD & DRINK", icon: Utensils };
      case "document":
        return { label: "DOCUMENT", icon: FileText };
      case "logo":
        return { label: "LOGO & BRAND", icon: Shield };
      case "screenshot":
        return { label: "SCREENSHOT", icon: Monitor };
      case "illustration":
        return { label: "ILLUSTRATION", icon: Palette };
      default:
        return { label: "OBJECT", icon: Sparkles };
    }
  };

  const categoryInfo = getCategoryDetails(detectedCategory);
  const CategoryIcon = categoryInfo.icon;
  const recommendedPresets = getRecommendedPresets((detectedCategory as DetectedCategory) || "other");
  const currentPreset = activePreset || recommendedPresets[0] || TRANSPARENT_PRESET;

  return (
    <div className="w-full rounded-[20px] bg-[#131A3A]/90 backdrop-blur-2xl border border-white/15 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(79,124,255,0.15)] flex flex-col gap-3 select-none animate-in fade-in duration-200">
      {/* 1. Header Row: Automated Detected Subject Badge + Framing Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-status-success/20 border border-status-success/50 flex items-center justify-center text-status-success shadow-[0_0_10px_rgba(34,197,94,0.3)] shrink-0">
            <Check size={13} strokeWidth={3} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-primary/20 border border-primary/40 text-xs font-bold text-white shadow-sm">
            <CategoryIcon size={13} className="text-accent" />
            <span>Detected:</span>
            <span className="text-accent uppercase tracking-wider">{categoryInfo.label}</span>
          </div>
        </div>

        {/* Proportional Smart Framing Controls (Fit, Balanced, Spacious) */}
        {onPaddingChange && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Sliders size={12} className="text-accent" />
            <span className="text-[11px] font-medium hidden sm:inline">Framing:</span>
            <div className="inline-flex rounded-pill bg-[#0A0B1E] p-0.5 border border-white/10">
              {[
                { label: "Fit (0%)", val: 0 },
                { label: "Balanced (8%)", val: 8 },
                { label: "Spacious (15%)", val: 15 },
              ].map((pad) => (
                <button
                  key={pad.val}
                  type="button"
                  onClick={() => onPaddingChange(pad.val)}
                  className={`px-2.5 py-0.5 rounded-pill text-[10px] font-semibold transition-all cursor-pointer ${
                    paddingPercent === pad.val
                      ? "bg-accent text-[#0A0B1E] font-bold shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                      : "text-text-secondary hover:text-white"
                  }`}
                >
                  {pad.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Automatically Generated Smart Background Recommendations Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
            <Layers size={13} className="text-accent" />
            <span>Smart Background Recommendations:</span>
          </span>
        </div>

        {/* Dynamic recommendation chips with color swatch + clear text labels */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
          {recommendedPresets.map((preset) => {
            const isSelected = currentPreset.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset && onSelectPreset(preset)}
                title={preset.description || preset.name}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-pill text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white border border-accent/60 shadow-[0_0_14px_rgba(79,124,255,0.6)] scale-[1.03]"
                    : "bg-white/[0.05] hover:bg-white/10 text-text-secondary hover:text-white border border-white/10"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full border border-white/30 shrink-0 shadow-sm ${preset.previewBg}`}
                />
                <span className="truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
