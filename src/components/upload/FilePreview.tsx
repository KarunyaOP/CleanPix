"use client";

import React from "react";
import { X, CheckCircle2, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { formatFileSize } from "@/utils/fileValidation";
import { ExportSection } from "@/components/upload/ExportSection";

export interface FilePreviewProps {
  file: File;
  previewUrl: string;
  processedUrl?: string | null;
  detectedObject?: string | null;
  dimensions: { width: number; height: number } | null;
  jobId: string | null;
  isUploading: boolean;
  isProcessingAI?: boolean;
  uploadProgress: number;
  isHdReady?: boolean;
  isEnhancingHd?: boolean;
  hdError?: string | null;
  onRemove: () => void;
  onChooseAnother: () => void;
  onRemoveBackground: () => void;
  onEnhanceHd?: () => void;
  onDownloadStandard?: () => void;
  onDownloadHd?: () => void;
  onCopyClipboard?: () => Promise<void>;
  onOpenSocialKit?: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  previewUrl,
  processedUrl,
  detectedObject,
  dimensions,
  isUploading,
  isProcessingAI = false,
  uploadProgress,
  isHdReady = false,
  isEnhancingHd = false,
  hdError = null,
  onRemove,
  onChooseAnother,
  onRemoveBackground,
  onEnhanceHd,
  onDownloadStandard,
  onDownloadHd,
  onCopyClipboard,
  onOpenSocialKit,
}) => {
  const extension = file.name.split(".").pop()?.toUpperCase() || "IMAGE";
  const isReady = !isUploading && !isProcessingAI && Boolean(processedUrl);

  return (
    <div className="w-full rounded-[24px] bg-[#131A3A]/85 backdrop-blur-2xl border border-primary/40 p-5 sm:p-7 shadow-[0_16px_48px_rgba(0,0,0,0.6),0_0_30px_rgba(79,124,255,0.2)] animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-chip flex items-center justify-center ${
              isProcessingAI || isUploading
                ? "bg-primary/20 border border-primary/40 text-accent animate-spin"
                : isReady
                ? "bg-status-success/20 border border-status-success/40 text-status-success shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                : "bg-primary/20 border border-primary/30 text-accent"
            }`}
          >
            {isProcessingAI || isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isReady ? (
              <CheckCircle2 size={16} />
            ) : (
              <Sparkles size={16} />
            )}
          </div>
          <span className="text-sm font-semibold text-[#F8FAFC]">
            {isProcessingAI
              ? "AI Removing Background..."
              : isUploading
              ? "Uploading..."
              : isReady
              ? "Background Removed!"
              : "Ready to Remove Background"}
          </span>
        </div>

        {/* Remove / Cancel Button */}
        <button
          onClick={onRemove}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-xs font-medium text-text-secondary hover:text-white bg-white/[0.04] hover:bg-red-500/20 hover:border-red-500/30 border border-white/10 transition-all duration-150 cursor-pointer"
          title="Remove image and return to home"
        >
          <X size={14} />
          <span>Remove</span>
        </button>
      </div>

      {/* Main Preview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Left Thumbnail with Checkerboard */}
        <div className="sm:col-span-5 relative aspect-square max-h-[200px] w-full rounded-[16px] overflow-hidden border border-white/15 bg-[#0E142A] checkerboard-pattern flex items-center justify-center shadow-inner">
          {isProcessingAI || isUploading ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-accent p-3">
              <Loader2 size={24} className="animate-spin mb-2" />
              <span className="text-[11px] font-semibold text-white/90 text-center">
                {isProcessingAI ? "AI Removing Background..." : "Uploading..."}
              </span>
            </div>
          ) : (
            <img
              src={processedUrl || previewUrl}
              alt={file.name}
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          )}
          {/* Format Badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-pill bg-[#0A0B1E]/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-accent tracking-wider">
            {processedUrl ? "PNG (ALPHA)" : extension}
          </div>
        </div>

        {/* Right Metadata Details */}
        <div className="sm:col-span-7 flex flex-col justify-between h-full gap-4">
          <div>
            <h4
              className="text-base font-semibold text-text-primary truncate max-w-full mb-2"
              title={file.name}
            >
              {file.name}
            </h4>

            {/* Metadata Tags */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              {dimensions && dimensions.width > 0 ? (
                <span className="px-2.5 py-1 rounded-badge bg-surface-elevated/80 border border-white/10 font-mono text-white/90">
                  {dimensions.width} × {dimensions.height} px
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-badge bg-surface-elevated/80 border border-white/10 font-mono text-white/90">
                  {formatFileSize(file.size)}
                </span>
              )}
              {dimensions && dimensions.width > 0 && file.size > 0 && (
                <span className="text-text-muted text-[11px] font-mono">
                  • {formatFileSize(file.size)}
                </span>
              )}
            </div>
          </div>

          {/* Upload / AI Progress Bar */}
          {(isUploading || isProcessingAI) && (
            <div className="w-full space-y-1.5">
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

          {/* Action CTAs for Pre-Processing */}
          {!isReady && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onChooseAnother}
                disabled={isProcessingAI}
                className="px-4 py-2.5 rounded-btn text-xs font-medium text-text-secondary hover:text-white bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Open file picker to select a different image"
              >
                <RefreshCw size={13} />
                <span>Choose Another</span>
              </button>

              {/* If background is not removed yet and not processing: show Remove Background */}
              {!processedUrl && !isProcessingAI && !isUploading && (
                <button
                  type="button"
                  onClick={onRemoveBackground}
                  className="flex-1 px-5 py-2.5 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_24px_rgba(79,124,255,0.6)] hover:shadow-[0_0_36px_rgba(79,124,255,0.85)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles size={14} className="text-accent animate-pulse" />
                  <span>Remove Background</span>
                </button>
              )}

              {/* While processing: show Disabled Loading Button */}
              {(isProcessingAI || isUploading) && (
                <button
                  type="button"
                  disabled={true}
                  className="flex-1 px-5 py-2.5 rounded-btn text-xs font-heading font-semibold text-white/80 bg-[#1B2350] border border-primary/40 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span>Removing Background...</span>
                </button>
              )}
            </div>
          )}

          {/* Top Quick Actions when Ready */}
          {isReady && (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onChooseAnother}
                className="px-3.5 py-2 rounded-btn text-xs font-medium text-text-secondary hover:text-white bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Open file picker to select a different image"
              >
                <RefreshCw size={13} />
                <span>Change Image</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Professional Export Section with Dual Downloads, HD Enhancement, Clipboard Copy & Social Media Kit */}
      {isReady && onDownloadStandard && onEnhanceHd && onDownloadHd && onCopyClipboard && (
        <ExportSection
          dimensions={dimensions}
          fileSize={file.size}
          isHdReady={isHdReady}
          isEnhancingHd={isEnhancingHd}
          hdError={hdError}
          onEnhanceHd={onEnhanceHd}
          onDownloadStandard={onDownloadStandard}
          onDownloadHd={onDownloadHd}
          onCopyClipboard={onCopyClipboard}
          onOpenSocialKit={onOpenSocialKit}
        />
      )}
    </div>
  );
};

