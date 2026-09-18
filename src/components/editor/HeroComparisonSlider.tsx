"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, ShoppingBag, Instagram, User, BarChart2, Sparkles, Menu, Loader2, Sliders, Smartphone, Dog, Car, Layers, Utensils, FileText, Shield, Monitor, Palette } from "lucide-react";
import { DetectedCategory, SmartBackgroundPreset } from "@/types/schema";
import { getRecommendedPresets, TRANSPARENT_PRESET } from "@/utils/backgroundPresets";

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

export const HeroComparisonSlider: React.FC<HeroComparisonSliderProps> = ({
  customOriginalUrl,
  customCutoutUrl,
  detectedCategory,
  isProcessing = false,
  activePreset,
  onSelectPreset,
  paddingPercent = 0,
  onPaddingChange,
  onOpenSocialKit,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [internalPreset, setInternalPreset] = useState<SmartBackgroundPreset>(TRANSPARENT_PRESET);
  const [useCasesOpen, setUseCasesOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const useCasesRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastAnimatedCutoutRef = useRef<string | null>(null);

  const currentPreset = activePreset || internalPreset;
  const recommendedPresets = getRecommendedPresets(detectedCategory);

  // Active images: if custom upload, strictly use custom URLs; otherwise use demo images
  const isCustomUpload = Boolean(customOriginalUrl);
  const originalImage = customOriginalUrl || "/images/hero-original.jpg";
  const cutoutImage = customCutoutUrl || (isCustomUpload ? "" : "/images/hero-cutout.jpg");

  // When a new custom image is uploaded, show BEFORE image fully
  useEffect(() => {
    if (customOriginalUrl && !customCutoutUrl) {
      setSliderPosition(100);
      lastAnimatedCutoutRef.current = null;
    }
  }, [customOriginalUrl, customCutoutUrl]);

  // When real background-removed cutout is ready, automatically animate divider to reveal result
  useEffect(() => {
    if (customCutoutUrl && customCutoutUrl !== lastAnimatedCutoutRef.current) {
      lastAnimatedCutoutRef.current = customCutoutUrl;

      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      const startPos = 100;
      const targetPos = 15;
      const durationMs = 1300;
      let startTime: number | null = null;

      const animateStep = (now: number) => {
        if (!startTime) startTime = now;
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        // Cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentPos = startPos + (targetPos - startPos) * eased;

        setSliderPosition(currentPos);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animateStep);
        }
      };

      const timeoutId = setTimeout(() => {
        animFrameRef.current = requestAnimationFrame(animateStep);
      }, 120);

      return () => {
        clearTimeout(timeoutId);
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    }
  }, [customCutoutUrl]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (useCasesRef.current && !useCasesRef.current.contains(event.target as Node)) {
        setUseCasesOpen(false);
      }
    };
    if (useCasesOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [useCasesOpen]);

  const handleMove = useCallback((clientX: number) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPercentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(clampedPercentage);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !e.touches[0]) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleInteractionEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleInteractionEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleInteractionEnd);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleInteractionEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleInteractionEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleInteractionEnd]);

  const handlePresetClick = (preset: SmartBackgroundPreset) => {
    if (onSelectPreset) {
      onSelectPreset(preset);
    } else {
      setInternalPreset(preset);
    }
  };

  const getCategoryDetails = (cat?: DetectedCategory | null) => {
    switch (cat) {
      case "person":
        return { label: "Person", icon: <User size={13} className="text-accent" /> };
      case "product":
        return { label: "Product", icon: <ShoppingBag size={13} className="text-accent" /> };
      case "pet":
        return { label: "Pet", icon: <Dog size={13} className="text-accent" /> };
      case "vehicle":
        return { label: "Vehicle", icon: <Car size={13} className="text-accent" /> };
      case "food":
        return { label: "Food", icon: <Utensils size={13} className="text-accent" /> };
      case "document":
        return { label: "Document", icon: <FileText size={13} className="text-accent" /> };
      case "logo":
        return { label: "Logo", icon: <Shield size={13} className="text-accent" /> };
      case "screenshot":
        return { label: "Screenshot", icon: <Monitor size={13} className="text-accent" /> };
      case "illustration":
        return { label: "Illustration", icon: <Palette size={13} className="text-accent" /> };
      default:
        return { label: "Object", icon: <Sparkles size={13} className="text-accent" /> };
    }
  };

  const categoryInfo = getCategoryDetails(detectedCategory);

  return (
    <div className="relative w-full max-w-[580px] mx-auto select-none flex flex-col">
      {/* 1. LAYERED AMBIENT BACKLIGHT ORBS */}
      <div className="absolute -inset-6 bg-gradient-to-tr from-[#4F7CFF]/35 via-[#8B5CF6]/30 to-[#22D3EE]/25 rounded-[40px] blur-3xl opacity-75 -z-10 animate-pulse-glow pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-[#4F7CFF]/40 blur-2xl -z-10 pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-[#8B5CF6]/35 blur-2xl -z-10 pointer-events-none" />

      {/* 2. FLOATING SECONDARY THUMBNAIL STACK (BEHIND/LEFT) */}
      <div className="absolute -left-6 top-8 w-28 h-32 rounded-frame bg-surface-glass border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.5)] -rotate-12 -z-10 hidden sm:block overflow-hidden opacity-70 hover:opacity-100 hover:-rotate-6 transition-all duration-300">
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={originalImage}
            alt="Source preview"
            className="w-full h-full object-contain p-1 filter brightness-90 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B1E]/90 via-transparent to-transparent p-2 flex items-end pointer-events-none">
            <span className="text-[10px] text-text-secondary font-mono tracking-wide truncate">
              {customOriginalUrl ? "custom_upload" : "portrait.jpg"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN GLOWING HERO SHOWCASE FRAME (CLEAN & UNCLUTTERED) */}
      <div
        ref={containerRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          if (e.touches[0]) handleMove(e.touches[0].clientX);
        }}
        className="relative aspect-square w-full rounded-[24px] border-2 border-primary/50 bg-[#0E142A] shadow-[0_0_50px_rgba(79,124,255,0.35),0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden cursor-ew-resize group"
      >
        {/* Top inner glass sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent z-30 pointer-events-none" />

        {/* AI Processing Scanning Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-[#0A0B1E]/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-primary/25 border border-primary flex items-center justify-center text-accent shadow-[0_0_30px_rgba(79,124,255,0.8)] mb-3 animate-spin">
              <Loader2 size={28} />
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">
              AI Removing Background...
            </span>
          </div>
        )}

        {/* AFTER LAYER: Cutout on Selected Background (Maximized Preview Area) */}
        <div
          className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden transition-all duration-300 ${
            currentPreset.id === "transparent" ? "checkerboard-pattern" : ""
          }`}
          style={
            currentPreset.id !== "transparent"
              ? { background: currentPreset.value }
              : undefined
          }
        >
          {isCustomUpload && !customCutoutUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-accent p-4">
              <Loader2 size={32} className="animate-spin mb-2 opacity-80" />
              <span className="text-xs font-semibold text-white/80">AI Removing Background...</span>
            </div>
          ) : (
            <img
              src={cutoutImage}
              alt="AI Cutout Result"
              className="w-full h-full object-contain select-none pointer-events-none filter drop-shadow-md transition-all duration-200"
              style={
                paddingPercent > 0
                  ? { padding: `${paddingPercent}%` }
                  : undefined
              }
              draggable={false}
            />
          )}
        </div>

        {/* BEFORE LAYER: Original Image with Background (Maximized Edge-to-Edge Alignment) */}
        <div
          className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden pointer-events-none"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            WebkitClipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          }}
        >
          <img
            src={originalImage}
            alt="Original Image with Background"
            className="w-full h-full object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>

        {/* FLOATING GLASS PILL: "Before" */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <div className="px-3.5 py-1 rounded-pill bg-[#0A0B1E]/75 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white uppercase tracking-wider shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Before
          </div>
        </div>

        {/* FLOATING GLASS PILL: "After" */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <div className="px-3.5 py-1 rounded-pill bg-[#0A0B1E]/75 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white uppercase tracking-wider shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            After
          </div>
        </div>

        {/* SLIDER DIVIDER LINE & TACTILE GRAB HANDLE */}
        <div
          className="absolute top-0 bottom-0 z-20 w-[2.5px] bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)] pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary border-2 border-white shadow-[0_0_24px_rgba(79,124,255,0.9)] flex items-center justify-center transition-transform duration-150 ${
              isDragging ? "scale-115 shadow-[0_0_32px_rgba(34,211,238,1)]" : "group-hover:scale-105"
            }`}
          >
            <div className="flex items-center gap-0.5 text-white font-mono text-xs font-black">
              <span>‹</span>
              <span>›</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DEDICATED DETECTION & RECOMMENDATIONS PANEL (PLACED CLEANLY BELOW IMAGE) */}
      <div className="w-full mt-4 rounded-[20px] bg-[#131A3A]/90 backdrop-blur-2xl border border-white/15 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(79,124,255,0.15)] flex flex-col gap-3">
        {/* Header Row: Category Detection Label + Framing Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-status-success/20 border border-status-success/50 flex items-center justify-center text-status-success shadow-[0_0_10px_rgba(34,197,94,0.3)] shrink-0">
              <Check size={13} strokeWidth={3} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-primary/20 border border-primary/40 text-xs font-bold text-white shadow-sm">
              {categoryInfo.icon}
              <span>Detected:</span>
              <span className="text-accent uppercase tracking-wider">{categoryInfo.label}</span>
            </div>
          </div>

          {/* Proportional Smart Padding Controls */}
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

        {/* Smart Background Recommendations with Clear Visible Names */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <Layers size={13} className="text-accent" />
              <span>Smart Background Recommendations:</span>
            </span>
            {onOpenSocialKit && customCutoutUrl && (
              <button
                type="button"
                onClick={onOpenSocialKit}
                className="text-[11px] text-accent hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles size={12} />
                <span>Social Kit</span>
              </button>
            )}
          </div>

          {/* Recommendations List with Swatch + Clear Text Labels */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
            {recommendedPresets.map((preset) => {
              const isSelected = currentPreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
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
    </div>
  );
};
