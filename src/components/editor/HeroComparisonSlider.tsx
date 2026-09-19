"use client";

import React from "react";
import { ProcessedPreviewCard } from "@/components/editor/ProcessedPreviewCard";
import { LandingDetectedPanel } from "@/components/editor/LandingDetectedPanel";
import { DetectedCategory, SmartBackgroundPreset } from "@/types/schema";
import { TRANSPARENT_PRESET } from "@/utils/backgroundPresets";

export interface HeroComparisonSliderProps {
  customOriginalUrl?: string | null;
  customCutoutUrl?: string | null;
  detectedCategory?: DetectedCategory | null;
  isProcessing?: boolean;
  activePreset?: SmartBackgroundPreset;
  onSelectPreset?: (preset: SmartBackgroundPreset) => void;
  paddingPercent?: number;
  onPaddingChange?: (padding: number) => void;
  onOpenSocialKit?: () => void;
}

/**
 * Static Before / After Showcase (Draggable slider removed completely).
 * Desktop/Tablet: Side-by-side Before and After cards.
 * Mobile/Android: Stacked Before (top) and After (bottom) cards.
 */
export const HeroComparisonSlider: React.FC<HeroComparisonSliderProps> = ({
  customOriginalUrl,
  customCutoutUrl,
  detectedCategory,
  isProcessing = false,
  activePreset = TRANSPARENT_PRESET,
  onSelectPreset,
  paddingPercent = 0,
  onPaddingChange,
}) => {
  const original = customOriginalUrl || "/images/hero-original.jpg";
  const cutout = customCutoutUrl || (customOriginalUrl ? null : "/images/hero-cutout.jpg");

  return (
    <div className="w-full flex flex-col gap-4 select-none">
      <ProcessedPreviewCard
        originalUrl={original}
        processedUrl={cutout}
        isProcessing={isProcessing}
        onCopyClipboard={async () => {}}
        detectedCategory={detectedCategory}
        showCopySection={false}
        activePreset={activePreset}
        paddingPercent={paddingPercent}
      />

      <LandingDetectedPanel
        detectedCategory={detectedCategory || "person"}
        activePreset={activePreset}
        onSelectPreset={onSelectPreset}
        paddingPercent={paddingPercent}
        onPaddingChange={onPaddingChange}
      />
    </div>
  );
};
