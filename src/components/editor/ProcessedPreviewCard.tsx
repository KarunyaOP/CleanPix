"use client";

import React, { useState } from "react";
import { Copy, Check, Sparkles, Loader2, Image as ImageIcon } from "lucide-react";
import { SmartBackgroundPreset } from "@/types/schema";
import { TRANSPARENT_PRESET } from "@/utils/backgroundPresets";

export interface ProcessedPreviewCardProps {
  originalUrl: string;
  processedUrl?: string | null;
  isProcessing?: boolean;
  isHd?: boolean;
  onCopyClipboard: () => Promise<void>;
  detectedCategory?: string | null;
  showCopySection?: boolean;
  activePreset?: SmartBackgroundPreset;
  paddingPercent?: number;
  initialTab?: "before" | "after";
}

export const ProcessedPreviewCard: React.FC<ProcessedPreviewCardProps> = ({
  originalUrl,
  processedUrl,
  isProcessing = false,
  isHd = false,
  onCopyClipboard,
  detectedCategory,
  showCopySection = true,
  activePreset = TRANSPARENT_PRESET,
  paddingPercent = 0,
}) => {
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const handleCopyClick = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      await onCopyClipboard();
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      // Parent handles error toast
    } finally {
      setIsCopying(false);
    }
  };

  const isCutoutReady = Boolean(processedUrl);

  return (
    <div className="relative w-full max-w-[720px] mx-auto select-none flex flex-col gap-4">
      {/* Ambient Lighting Glow (Pointer Events None) */}
      <div className="absolute -inset-6 bg-gradient-to-tr from-[#4F7CFF]/25 via-[#8B5CF6]/20 to-[#22D3EE]/15 rounded-[40px] blur-3xl opacity-75 -z-10 pointer-events-none" />

      {/* STATIC BEFORE / AFTER COMPARISON VIEW */}
      {/* Desktop/Tablet: Side-by-Side (2 Columns) | Mobile/Android: Stacked (1 Column: Before on Top, After Below) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {/* 1. BEFORE CARD (Original Source) */}
        <div className="relative aspect-square w-full rounded-[22px] border-2 border-white/10 bg-[#0E142A] shadow-[0_8px_32px_rgba(0,0,0,0.45)] overflow-hidden flex flex-col justify-between group">
          {/* Top Bar with Clear "Before" Label */}
          <div className="relative z-20 px-3.5 py-2.5 bg-[#0A0B1E]/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-[#131A3A] border border-white/15 text-xs font-bold text-white shadow-sm">
              <span className="w-2 h-2 rounded-full bg-text-secondary" />
              <span>Before</span>
            </div>
            <span className="text-[11px] font-medium text-text-muted">
              Original Source
            </span>
          </div>

          {/* Before Image Container */}
          <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-[#0A0B1E]">
            {originalUrl ? (
              <img
                src={originalUrl}
                alt="Before - Original Source"
                className={`w-full h-full select-none filter drop-shadow-sm transition-all duration-200 ${
                  paddingPercent === 0
                    ? "object-contain object-bottom"
                    : "object-contain object-center"
                }`}
                style={
                  paddingPercent > 0
                    ? { padding: `${Math.round(paddingPercent * 0.12)}%` }
                    : undefined
                }
                draggable={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-text-muted p-4 text-center">
                <ImageIcon size={32} className="mb-1 opacity-50" />
                <span className="text-xs">No image loaded</span>
              </div>
            )}
          </div>

          {/* Bottom Status Caption */}
          <div className="relative z-20 px-3.5 py-2 bg-[#0A0B1E]/80 backdrop-blur-md border-t border-white/[0.08] flex items-center justify-between text-[10px] sm:text-[11px] text-text-muted font-mono">
            <span>Original Image</span>
            <span>Unedited</span>
          </div>
        </div>

        {/* 2. AFTER CARD (AI Background Removed Cutout) */}
        <div className="relative aspect-square w-full rounded-[22px] border-2 border-primary/45 bg-[#0E142A] shadow-[0_0_36px_rgba(79,124,255,0.25),0_12px_40px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col justify-between group">
          {/* Top inner glass sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-20 pointer-events-none" />

          {/* Top Bar with Dynamic "After" or "After (HD Enhanced)" Label */}
          <div className="relative z-20 px-3.5 py-2.5 bg-[#0A0B1E]/85 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-gradient-to-r from-primary to-secondary border border-accent/40 text-xs font-bold text-white shadow-[0_0_12px_rgba(79,124,255,0.6)]">
              <Sparkles size={11} className="text-accent" />
              <span>{isHd ? "After (HD Enhanced)" : "After"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-bold text-white">
                {activePreset.id === "transparent"
                  ? "Alpha PNG"
                  : activePreset.name}
              </span>
            </div>
          </div>

          {/* AI Processing Scanning Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 z-30 bg-[#0A0B1E]/75 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-primary/25 border border-primary flex items-center justify-center text-accent shadow-[0_0_24px_rgba(79,124,255,0.8)] mb-2.5 animate-spin">
                <Loader2 size={24} />
              </div>
              <span className="text-xs font-semibold text-white tracking-wide">
                AI Removing Background...
              </span>
            </div>
          )}

          {/* After Image Container */}
          <div
            className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden transition-all duration-300 ${
              activePreset.id === "transparent" ? "checkerboard-pattern" : "bg-[#0A0B1E]"
            }`}
            style={
              activePreset.id !== "transparent"
                ? { background: activePreset.value }
                : undefined
            }
          >
            {processedUrl ? (
              <img
                key={processedUrl}
                src={processedUrl}
                alt={isHd ? "After - AI Background Removed (HD Enhanced)" : "After - AI Background Removed"}
                className={`w-full h-full select-none filter drop-shadow-md transition-all duration-200 ${
                  paddingPercent === 0
                    ? "object-contain object-bottom"
                    : "object-contain object-center"
                }`}
                style={
                  paddingPercent > 0
                    ? { padding: `${Math.round(paddingPercent * 0.12)}%` }
                    : undefined
                }
                draggable={false}
              />
            ) : isProcessing ? (
              <div className="flex flex-col items-center justify-center text-accent p-4 text-center">
                <Loader2 size={32} className="animate-spin mb-2 opacity-80" />
                <span className="text-xs text-text-secondary">Processing cutout...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-accent p-4 text-center">
                <ImageIcon size={32} className="mb-2 opacity-60" />
                <span className="text-xs text-text-secondary">Ready to process cutout</span>
              </div>
            )}
          </div>

          {/* Bottom Status Pill inside Preview */}
          <div className="relative z-20 px-3.5 py-2 bg-[#0A0B1E]/80 backdrop-blur-md border-t border-white/[0.08] flex items-center justify-between text-[10px] sm:text-[11px] text-text-secondary font-mono">
            <span>
              Format: <strong className="text-accent">{activePreset.id === "transparent" ? "PNG (Alpha)" : "Preset"}</strong>
            </span>
            <span className="text-text-muted">100% Lossless</span>
          </div>
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
              <span className="text-[11px] text-text-muted">
                Paste directly into WhatsApp, Canva, Photoshop, PowerPoint & Word
              </span>
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
