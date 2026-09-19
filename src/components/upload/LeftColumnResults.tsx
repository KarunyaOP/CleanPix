"use client";

import React from "react";
import {
  Download,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  Share2,
  CheckCircle2,
  Instagram,
  Smartphone,
  Youtube,
  Linkedin,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { formatFileSize } from "@/utils/fileValidation";
import { DetectedCategory } from "@/types/schema";

export interface LeftColumnResultsProps {
  file: File;
  previewUrl: string;
  processedUrl?: string | null;
  detectedCategory?: DetectedCategory | null;
  dimensions: { width: number; height: number } | null;
  isUploading: boolean;
  isProcessingAI?: boolean;
  uploadProgress: number;
  isHdReady: boolean;
  isEnhancingHd: boolean;
  hdError: string | null;
  error?: { code: string; message: string; details?: string } | null;
  onBack: () => void;
  onChangeImage: () => void;
  onRemoveImage?: () => void;
  onRemoveBackground: () => void;
  onDownloadStandard: () => void;
  onEnhanceHd: () => void;
  onDownloadHd: () => void;
  onOpenSocialKit: () => void;
  onClearError?: () => void;
}

export const LeftColumnResults: React.FC<LeftColumnResultsProps> = ({
  file,
  previewUrl,
  processedUrl,
  detectedCategory = "other",
  dimensions,
  isUploading,
  isProcessingAI = false,
  uploadProgress,
  isHdReady,
  isEnhancingHd,
  hdError,
  error,
  onBack,
  onChangeImage,
  onRemoveImage,
  onRemoveBackground,
  onDownloadStandard,
  onEnhanceHd,
  onDownloadHd,
  onOpenSocialKit,
  onClearError,
}) => {
  const isCutoutReady = !isUploading && !isProcessingAI && Boolean(processedUrl);
  const baseWidth = dimensions?.width || 1200;
  const baseHeight = dimensions?.height || 800;
  const hdWidth = baseWidth * 2;
  const hdHeight = baseHeight * 2;

  const standardSizeEst = file.size ? Math.round(file.size * 0.75) : 380 * 1024;
  const hdSizeEst = file.size ? Math.round(file.size * 1.8) : 1.4 * 1024 * 1024;

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-200 select-none">
      {/* TOP ACTION BAR: Single Clean [ Back to Editor ] */}
      <div className="w-full flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-btn text-xs font-heading font-semibold text-text-secondary hover:text-white bg-[#131A3A]/90 hover:bg-[#1B2350] border border-white/12 hover:border-primary/40 shadow-sm transition-all duration-150 cursor-pointer active:scale-95"
          title="Return to CleanPix Editor"
        >
          <ArrowLeft size={13} className="text-accent" />
          <span>Back to Editor</span>
        </button>
      </div>

      {/* 1. ORIGINAL IMAGE DETAILS CARD */}
      <div className="rounded-[22px] bg-[#131A3A]/90 backdrop-blur-2xl border border-primary/35 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_24px_rgba(79,124,255,0.15)] flex flex-col gap-4">
        {/* Status Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isProcessingAI || isUploading
                  ? "bg-primary/20 text-accent animate-spin"
                  : isCutoutReady
                  ? "bg-status-success/20 text-status-success"
                  : "bg-primary/20 text-accent"
              }`}
            >
              {isProcessingAI || isUploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isCutoutReady ? (
                <CheckCircle2 size={14} />
              ) : (
                <Sparkles size={14} />
              )}
            </div>
            <span className="text-xs font-bold text-white">
              {isProcessingAI
                ? "Removing Background..."
                : isUploading
                ? "Uploading..."
                : isCutoutReady
                ? "Background Removed"
                : "Original Image Ready"}
            </span>
          </div>

          {/* Primary Change Image Button */}
          <button
            type="button"
            onClick={onChangeImage}
            disabled={isProcessingAI || isUploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold text-text-secondary hover:text-white bg-white/[0.06] hover:bg-white/15 border border-white/15 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm"
            title="Choose a different image file"
          >
            <RefreshCw size={12} />
            <span>Change Image</span>
          </button>
        </div>

        {/* Thumbnail + Metadata Info */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-[14px] overflow-hidden border border-white/15 bg-[#0E142A] checkerboard-pattern flex items-center justify-center shrink-0 shadow-inner">
            <img
              src={processedUrl || previewUrl}
              alt={file.name}
              className="w-full h-full object-contain p-1"
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
            <h4 className="text-sm font-bold text-white truncate" title={file.name}>
              {file.name}
            </h4>

            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary font-mono">
              {dimensions && dimensions.width > 0 ? (
                <span className="px-2.5 py-0.5 rounded-pill bg-surface-elevated/90 border border-white/10 text-white/90 font-medium">
                  {dimensions.width} × {dimensions.height} px
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-pill bg-surface-elevated/90 border border-white/10 text-white/90 font-medium">
                  {formatFileSize(file.size)}
                </span>
              )}
              {dimensions && dimensions.width > 0 && file.size > 0 && (
                <span className="text-text-muted text-[11px]">
                  • {formatFileSize(file.size)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Upload / AI Progress Bar */}
        {(isUploading || isProcessingAI) && (
          <div className="w-full space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-text-secondary font-mono">
              <span>{isProcessingAI ? "Processing cutout..." : "Uploading..."}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#0A0B1E] overflow-hidden border border-white/10">
              <div
                className="h-full bg-brand-gradient transition-all duration-300 shadow-[0_0_10px_rgba(79,124,255,0.8)]"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Box & Try Again CTA */}
        {error && !isProcessingAI && !isUploading && (
          <div className="w-full p-3.5 rounded-[14px] bg-red-500/15 border border-red-500/40 text-red-200 flex flex-col gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <span className="font-bold text-red-100 block">
                  {error.message || "Background removal failed. Please try again."}
                </span>
                {error.details && (
                  <span className="text-[11px] text-red-300/80 block mt-0.5">
                    {error.details}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onRemoveBackground}
                className="flex-1 py-2 px-3 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-primary to-secondary hover:shadow-[0_0_16px_rgba(79,124,255,0.6)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} className="text-accent" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={onChangeImage}
                className="py-2 px-3 rounded-btn text-xs font-semibold text-text-secondary hover:text-white bg-white/[0.08] hover:bg-white/15 border border-white/15 transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Change Image</span>
              </button>
            </div>
          </div>
        )}

        {/* Initial Remove Background CTA if not started and no error */}
        {!processedUrl && !isProcessingAI && !isUploading && !error && (
          <button
            type="button"
            onClick={onRemoveBackground}
            className="w-full py-3 px-4 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_24px_rgba(79,124,255,0.6)] hover:shadow-[0_0_36px_rgba(79,124,255,0.85)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={14} className="text-accent animate-pulse" />
            <span>Remove Background Now</span>
          </button>
        )}
      </div>

      {/* 2. EXPORT OPTIONS CARD */}
      {isCutoutReady && (
        <div className="rounded-[22px] bg-[#131A3A]/90 backdrop-blur-2xl border border-white/15 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.5)] flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Export Options
            </span>
            <span className="text-[11px] text-accent font-medium">PNG (Alpha)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Standard Download */}
            <div className="p-3.5 rounded-[16px] bg-[#0A0B1E]/80 border border-white/10 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Standard</span>
                  <span className="text-[10px] text-text-muted font-mono">1x</span>
                </div>
                <div className="text-[11px] text-text-secondary font-mono">
                  {baseWidth} × {baseHeight} px • ~{formatFileSize(standardSizeEst)}
                </div>
              </div>

              <button
                type="button"
                onClick={onDownloadStandard}
                className="w-full py-2 px-2.5 rounded-btn text-xs font-heading font-semibold text-white bg-white/[0.08] hover:bg-white/15 border border-white/15 hover:border-primary/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                <Download size={13} className="text-primary" />
                <span>Download PNG</span>
              </button>
            </div>

            {/* HD Download */}
            <div className="p-3.5 rounded-[16px] bg-gradient-to-b from-[#1B2350] to-[#0D132D] border border-accent/35 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Sparkles size={12} className="text-accent animate-pulse" />
                    <span className="text-xs font-bold text-white">HD Quality</span>
                  </div>
                  <span className="text-[10px] text-accent font-bold font-mono">2x DPR</span>
                </div>
                <div className="text-[11px] text-text-secondary font-mono">
                  {hdWidth} × {hdHeight} px • ~{formatFileSize(hdSizeEst)}
                </div>
              </div>

              {hdError ? (
                <button
                  type="button"
                  onClick={onEnhanceHd}
                  className="w-full py-2 px-2 rounded-btn text-xs font-semibold text-red-300 bg-red-500/20 border border-red-500/40 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <AlertCircle size={12} />
                  <span>Retry HD</span>
                </button>
              ) : isEnhancingHd ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2 px-2 rounded-btn text-xs font-semibold text-white/90 bg-[#1B2350] border border-accent/40 flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <Loader2 size={12} className="animate-spin text-accent" />
                  <span>Enhancing...</span>
                </button>
              ) : isHdReady ? (
                <button
                  type="button"
                  onClick={onDownloadHd}
                  className="w-full py-2 px-2.5 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-accent to-primary shadow-[0_0_16px_rgba(34,211,238,0.4)] hover:shadow-[0_0_24px_rgba(34,211,238,0.6)] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  <Download size={13} />
                  <span>Download HD</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onEnhanceHd}
                  className="w-full py-2 px-2.5 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_16px_rgba(79,124,255,0.5)] hover:shadow-[0_0_24px_rgba(79,124,255,0.75)] transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                >
                  <Sparkles size={13} className="text-accent animate-pulse" />
                  <span>Enhance HD</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. & 4. SOCIAL MEDIA KIT GENERATOR CARD + OPEN BUTTON */}
      {isCutoutReady && (
        <div className="rounded-[22px] bg-gradient-to-r from-[#131A3A] via-[#1B2350] to-[#131A3A] border border-primary/35 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_24px_rgba(79,124,255,0.15)] flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Share2 size={15} className="text-accent" />
              <span className="text-xs font-bold text-white">Social Media Kit Generator</span>
            </div>
            <span className="px-2 py-0.5 rounded-pill bg-primary/25 border border-primary/40 text-[10px] font-bold text-accent">
              4 Formats
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-text-secondary font-medium">
            <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-[#0A0B1E]/60 border border-white/5">
              <Instagram size={13} className="text-pink-400 shrink-0" />
              <span>Post (1:1)</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-[#0A0B1E]/60 border border-white/5">
              <Smartphone size={13} className="text-purple-400 shrink-0" />
              <span>Story (9:16)</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-[#0A0B1E]/60 border border-white/5">
              <Youtube size={13} className="text-red-400 shrink-0" />
              <span>Thumbnail (16:9)</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-[10px] bg-[#0A0B1E]/60 border border-white/5">
              <Linkedin size={13} className="text-blue-400 shrink-0" />
              <span>Profile (1:1)</span>
            </div>
          </div>

          {/* 4. OPEN SOCIAL KIT BUTTON */}
          <button
            type="button"
            onClick={onOpenSocialKit}
            className="w-full py-3 px-4 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(79,124,255,0.55)] hover:shadow-[0_0_30px_rgba(79,124,255,0.8)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={14} className="text-accent animate-pulse" />
            <span>Open Social Media Kit</span>
          </button>
        </div>
      )}
    </div>
  );
};
