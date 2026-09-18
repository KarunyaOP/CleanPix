"use client";

import React, { useState } from "react";
import { Download, Sparkles, Copy, Check, Loader2, AlertCircle, RefreshCw, Zap, Share2, Instagram, Smartphone, Youtube, Linkedin } from "lucide-react";
import { formatFileSize } from "@/utils/fileValidation";

export interface ExportSectionProps {
  dimensions: { width: number; height: number } | null;
  fileSize?: number;
  isHdReady: boolean;
  isEnhancingHd: boolean;
  hdError: string | null;
  onEnhanceHd: () => void;
  onDownloadStandard: () => void;
  onDownloadHd: () => void;
  onCopyClipboard: () => Promise<void>;
  onOpenSocialKit?: () => void;
}

export const ExportSection: React.FC<ExportSectionProps> = ({
  dimensions,
  fileSize,
  isHdReady,
  isEnhancingHd,
  hdError,
  onEnhanceHd,
  onDownloadStandard,
  onDownloadHd,
  onCopyClipboard,
  onOpenSocialKit,
}) => {
  const [isCopying, setIsCopying] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const baseWidth = dimensions?.width || 1200;
  const baseHeight = dimensions?.height || 800;
  const hdWidth = baseWidth * 2;
  const hdHeight = baseHeight * 2;

  // Estimated standard and HD PNG sizes based on dimensions and original file size
  const standardSizeEst = fileSize ? Math.round(fileSize * 0.75) : 380 * 1024;
  const hdSizeEst = fileSize ? Math.round(fileSize * 1.8) : 1.4 * 1024 * 1024;

  const handleCopyClick = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      await onCopyClipboard();
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      // Handled in parent
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="w-full mt-5 pt-5 border-t border-white/[0.1] space-y-4 animate-in fade-in duration-300 select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Professional Export Options
          </span>
        </div>
        <span className="text-[11px] text-accent font-medium">
          Alpha Transparency Preserved
        </span>
      </div>

      {/* Dual Quality Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* 1. STANDARD QUALITY CARD */}
        <div className="relative rounded-[16px] bg-[#0A0B1E]/80 border border-white/10 hover:border-primary/40 p-4 transition-all duration-200 flex flex-col justify-between gap-3 group">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                Standard Quality
              </span>
              <span className="px-2 py-0.5 rounded-pill bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-text-secondary">
                1x Resolution
              </span>
            </div>

            {/* Spec Details */}
            <div className="space-y-1 text-xs text-text-secondary font-mono">
              <div className="flex justify-between">
                <span>Resolution:</span>
                <strong className="text-text-primary">{baseWidth} × {baseHeight} px</strong>
              </div>
              <div className="flex justify-between">
                <span>Est. Size:</span>
                <strong className="text-text-primary">~{formatFileSize(standardSizeEst)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="text-accent font-semibold">PNG (Alpha)</span>
              </div>
            </div>
          </div>

          {/* Download Standard Button */}
          <button
            type="button"
            onClick={onDownloadStandard}
            className="w-full py-2.5 px-3 rounded-btn text-xs font-heading font-semibold text-white bg-white/[0.08] hover:bg-white/15 border border-white/15 hover:border-primary/50 shadow-sm hover:shadow-[0_0_16px_rgba(79,124,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            title="Download standard transparent PNG"
          >
            <Download size={14} className="text-primary" />
            <span>Download PNG (Standard)</span>
          </button>
        </div>

        {/* 2. HD ENHANCED QUALITY CARD */}
        <div className="relative rounded-[16px] bg-gradient-to-b from-[#131A3A] to-[#0D132D] border border-accent/30 hover:border-accent/60 p-4 shadow-[0_0_24px_rgba(34,211,238,0.12)] transition-all duration-200 flex flex-col justify-between gap-3 relative overflow-hidden">
          {/* Subtle top glow line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-accent animate-pulse" />
                <span className="text-sm font-bold text-white">
                  HD Quality
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-pill bg-accent/15 border border-accent/40 text-[10px] font-bold text-accent shadow-[0_0_8px_rgba(34,211,238,0.25)]">
                2x Ultra HD • Sharpened
              </span>
            </div>

            {/* Spec Details */}
            <div className="space-y-1 text-xs text-text-secondary font-mono">
              <div className="flex justify-between">
                <span>Resolution:</span>
                <strong className="text-accent">{hdWidth} × {hdHeight} px</strong>
              </div>
              <div className="flex justify-between">
                <span>Est. Size:</span>
                <strong className="text-text-primary">~{formatFileSize(hdSizeEst)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Optimization:</span>
                <span className="text-white font-semibold">q_auto:best + DPR 2.0</span>
              </div>
            </div>
          </div>

          {/* Action CTA: Enhance HD OR Download HD */}
          {hdError ? (
            /* Error with Retry State */
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[11px] text-red-400">
                <AlertCircle size={12} />
                <span className="truncate">{hdError}</span>
              </div>
              <button
                type="button"
                onClick={onEnhanceHd}
                className="w-full py-2 px-3 rounded-btn text-xs font-semibold text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Retry HD Enhancement</span>
              </button>
            </div>
          ) : isEnhancingHd ? (
            /* Enhancing HD Loading State */
            <button
              type="button"
              disabled
              className="w-full py-2.5 px-3 rounded-btn text-xs font-heading font-semibold text-white/90 bg-[#1B2350] border border-accent/40 flex items-center justify-center gap-2 cursor-not-allowed shadow-[0_0_15px_rgba(34,211,238,0.3)]"
            >
              <Loader2 size={14} className="animate-spin text-accent" />
              <span>Enhancing HD (Sharpening & 2x Detail)...</span>
            </button>
          ) : isHdReady ? (
            /* HD Ready -> Download HD Button */
            <button
              type="button"
              onClick={onDownloadHd}
              className="w-full py-2.5 px-3 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-accent via-primary to-secondary shadow-[0_0_24px_rgba(34,211,238,0.5)] hover:shadow-[0_0_32px_rgba(34,211,238,0.7)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Download 2x HD transparent PNG"
            >
              <Download size={14} />
              <span>Download PNG (HD Enhanced)</span>
            </button>
          ) : (
            /* Initial State -> Enhance HD Button */
            <button
              type="button"
              onClick={onEnhanceHd}
              className="w-full py-2.5 px-3 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(79,124,255,0.5)] hover:shadow-[0_0_30px_rgba(79,124,255,0.8)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
              title="Generate 2x high-resolution transparent PNG with edge sharpening"
            >
              <Sparkles size={14} className="text-accent animate-pulse" />
              <span>Enhance HD</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. SOCIAL MEDIA KIT GENERATOR ACTION CARD (PHASE 3) */}
      {onOpenSocialKit && (
        <div className="p-4 rounded-[16px] bg-gradient-to-r from-[#131A3A] via-[#1B2350] to-[#131A3A] border border-primary/35 shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_20px_rgba(79,124,255,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-chip bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-blue-500/20 border border-white/15 flex items-center justify-center shrink-0">
              <Share2 size={18} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white">Social Media Kit Generator</span>
                <span className="px-2 py-0.5 rounded-pill bg-primary/20 border border-primary/40 text-[10px] font-bold text-accent">1-Click</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-0.5">
                <span className="flex items-center gap-1"><Instagram size={11} className="text-pink-400" /> Post (1:1)</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Smartphone size={11} className="text-purple-400" /> Story (9:16)</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Youtube size={11} className="text-red-400" /> Thumbnail (16:9)</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Linkedin size={11} className="text-blue-400" /> Profile (1:1)</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenSocialKit}
            className="w-full sm:w-auto px-4 py-2.5 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_18px_rgba(79,124,255,0.5)] hover:shadow-[0_0_28px_rgba(79,124,255,0.75)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles size={14} className="text-accent animate-pulse" />
            <span>Open Social Kit</span>
          </button>
        </div>
      )}

      {/* 4. COPY IMAGE TO CLIPBOARD ACTION BAR */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-[14px] bg-[#0A0B1E]/90 border border-white/10">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Copy size={14} className="text-accent" />
          <span className="hidden sm:inline">Direct Paste to WhatsApp, Canva, Photoshop, PowerPoint, Word:</span>
          <span className="sm:hidden">Paste into apps:</span>
        </div>

        <button
          type="button"
          onClick={handleCopyClick}
          disabled={isCopying}
          className={`px-4 py-2 rounded-btn text-xs font-heading font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            hasCopied
              ? "bg-status-success/20 border border-status-success/50 text-status-success shadow-[0_0_16px_rgba(34,197,94,0.3)]"
              : "bg-white/[0.06] hover:bg-white/15 border border-white/15 hover:border-primary/40 text-white hover:shadow-[0_0_14px_rgba(79,124,255,0.3)] active:scale-[0.98]"
          }`}
          title="Copy transparent PNG directly to clipboard"
        >
          {isCopying ? (
            <>
              <Loader2 size={13} className="animate-spin text-accent" />
              <span>Copying...</span>
            </>
          ) : hasCopied ? (
            <>
              <Check size={13} className="text-status-success" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy Transparent PNG</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
