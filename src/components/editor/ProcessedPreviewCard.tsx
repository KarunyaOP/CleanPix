"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Sparkles, Loader2, Image as ImageIcon, Eye } from "lucide-react";

import { SmartBackgroundPreset } from "@/types/schema";
import { TRANSPARENT_PRESET } from "@/utils/backgroundPresets";

export interface ProcessedPreviewCardProps {
  originalUrl: string;
  processedUrl?: string | null;
  isProcessing?: boolean;
  onCopyClipboard: () => Promise<void>;
  detectedCategory?: string | null;
  showCopySection?: boolean;
  activePreset?: SmartBackgroundPreset;
  paddingPercent?: number;
}

export const ProcessedPreviewCard: React.FC<ProcessedPreviewCardProps> = ({
  originalUrl,
  processedUrl,
  isProcessing = false,
  onCopyClipboard,
  detectedCategory,
  showCopySection = true,
  activePreset = TRANSPARENT_PRESET,
  paddingPercent = 0,
}) => {
  // Default to "after" if processedUrl exists, otherwise "before"
  const [activeTab, setActiveTab] = useState<"before" | "after">(
    processedUrl ? "after" : "before"
  );
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // Automatically switch tabs: "after" when processed cutout arrives, "before" when fresh original is loaded
  useEffect(() => {
    if (processedUrl) {
      setActiveTab("after");
    } else {
      setActiveTab("before");
    }
  }, [processedUrl, originalUrl]);

  const handleCopyClick = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      await onCopyClipboard();
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      // Parent handles toast error
    } finally {
      setIsCopying(false);
    }
  };

  const isCutoutReady = Boolean(processedUrl);
  const displayImage = activeTab === "after" && processedUrl ? processedUrl : originalUrl;

  return (
    <div className="relative w-full max-w-[620px] mx-auto select-none flex flex-col gap-4">
      {/* Ambient Lighting Glow (Pointer Events None) */}
      <div className="absolute -inset-6 bg-gradient-to-tr from-[#4F7CFF]/30 via-[#8B5CF6]/25 to-[#22D3EE]/20 rounded-[40px] blur-3xl opacity-75 -z-10 pointer-events-none" />

      {/* 1. LARGE PROCESSED IMAGE PREVIEW CONTAINER */}
      <div className="relative aspect-square w-full rounded-[24px] border-2 border-primary/45 bg-[#0E142A] shadow-[0_0_50px_rgba(79,124,255,0.3),0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col justify-between group">
        {/* Top inner glass sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-20 pointer-events-none" />

        {/* Top Bar with Simple [ Before ] [ After ] Tabs */}
        <div className="relative z-20 px-4 py-3 bg-[#0A0B1E]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide">
              {activeTab === "after" ? "Transparent PNG Preview" : "Original Source Image"}
            </span>
          </div>

          {/* Clean Segmented Tab Control */}
          <div className="inline-flex rounded-pill bg-[#131A3A] p-0.5 border border-white/15 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("before")}
              className={`px-3.5 py-1 rounded-pill text-xs font-bold transition-all cursor-pointer ${
                activeTab === "before"
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              Before
            </button>
            <button
              type="button"
              onClick={() => {
                if (isCutoutReady) setActiveTab("after");
              }}
              disabled={!isCutoutReady}
              className={`px-3.5 py-1 rounded-pill text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                activeTab === "after"
                  ? "bg-gradient-to-r from-primary to-secondary text-white shadow-[0_0_14px_rgba(79,124,255,0.7)]"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              After
            </button>
          </div>
        </div>

        {/* AI Processing Scanning Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-[#0A0B1E]/70 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full bg-primary/25 border border-primary flex items-center justify-center text-accent shadow-[0_0_30px_rgba(79,124,255,0.8)] mb-3 animate-spin">
              <Loader2 size={28} />
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">
              AI Removing Background...
            </span>
          </div>
        )}

        {/* Main Full Image View Area (Maximized & Auto-Centered with Zero Obstructing Dividers) */}
        <div
          className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
            activeTab === "after" && activePreset.id === "transparent"
              ? "checkerboard-pattern"
              : "bg-[#0A0B1E]"
          }`}
          style={
            activeTab === "after" && activePreset.id !== "transparent"
              ? { background: activePreset.value }
              : undefined
          }
        >
          {displayImage ? (
            <img
              key={`${displayImage}-${activeTab}`}
              src={displayImage}
              alt="CleanPix Image View"
              className="w-full h-full object-contain select-none filter drop-shadow-md transition-all duration-200"
              style={
                activeTab === "after" && paddingPercent > 0
                  ? { padding: `${paddingPercent}%` }
                  : undefined
              }
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-accent p-6 text-center">
              <ImageIcon size={36} className="mb-2 opacity-60" />
              <span className="text-xs text-text-secondary">Ready to process cutout</span>
            </div>
          )}
        </div>

        {/* Bottom Status Pill inside Preview */}
        <div className="relative z-20 px-4 py-2 bg-[#0A0B1E]/80 backdrop-blur-md border-t border-white/[0.08] flex items-center justify-between text-[11px] text-text-secondary font-mono">
          <span>Format: <strong className="text-accent">{activeTab === "after" ? "PNG (Alpha Transparent)" : "Source"}</strong></span>
          <span className="text-text-muted">Full View • 100% Lossless</span>
        </div>
      </div>

      {/* 2. COPY TRANSPARENT PNG SECTION (RESULTS PAGE ONLY) */}
      {showCopySection && (
        <div className="w-full p-4 rounded-[20px] bg-[#131A3A]/90 backdrop-blur-2xl border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(79,124,255,0.15)] flex flex-col sm:flex-row items-center justify-between gap-3.5">
          <div className="flex items-center gap-2.5 text-xs text-text-secondary">
            <div className="w-7 h-7 rounded-chip bg-primary/20 border border-primary/30 flex items-center justify-center text-accent shrink-0">
              <Copy size={14} />
            </div>
            <div>
              <span className="font-bold text-white block">Copy Transparent PNG</span>
              <span className="text-[11px] text-text-muted">Paste directly into WhatsApp, Canva, Photoshop, PowerPoint & Word</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyClick}
            disabled={!isCutoutReady || isCopying}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-btn text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
              hasCopied
                ? "bg-status-success/25 border border-status-success/60 text-status-success shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                : "bg-gradient-to-r from-primary to-secondary text-white shadow-[0_0_20px_rgba(79,124,255,0.5)] hover:shadow-[0_0_30px_rgba(79,124,255,0.75)] hover:-translate-y-0.5 active:translate-y-0"
            }`}
            title="Copy transparent PNG to clipboard"
          >
            {isCopying ? (
              <>
                <Loader2 size={14} className="animate-spin text-accent" />
                <span>Copying Image...</span>
              </>
            ) : hasCopied ? (
              <>
                <Check size={14} className="text-status-success stroke-[3]" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copy Image</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
