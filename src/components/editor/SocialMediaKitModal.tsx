"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Sparkles,
  Archive,
  Layers,
  Loader2,
  Check,
  Smartphone,
  Youtube,
  Linkedin,
  Instagram,
  Sliders,
} from "lucide-react";
import {
  SOCIAL_MEDIA_FORMATS,
  downloadSocialKitItem,
  downloadSocialKitZip,
} from "@/utils/socialMediaKit";
import {
  getRecommendedPresets,
  TRANSPARENT_PRESET,
} from "@/utils/backgroundPresets";
import { DetectedCategory, SmartBackgroundPreset, SocialKitFormat } from "@/types/schema";

export interface SocialMediaKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string;
  detectedCategory?: DetectedCategory | null;
  initialPreset?: SmartBackgroundPreset;
  onNotify?: (message: string, type?: "success" | "info" | "error" | "hd") => void;
}

export const SocialMediaKitModal: React.FC<SocialMediaKitModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  fileName = "cleanpix",
  detectedCategory = "other",
  initialPreset,
  onNotify,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<SmartBackgroundPreset>(
    initialPreset || TRANSPARENT_PRESET
  );
  const [paddingPercent, setPaddingPercent] = useState<number>(8);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const recommendedPresets = getRecommendedPresets(detectedCategory);
  const baseName = fileName.replace(/\.[^/.]+$/, "");

  // Reset preset when modal opens or initialPreset changes
  useEffect(() => {
    if (isOpen) {
      if (initialPreset) setSelectedPreset(initialPreset);
    }
  }, [isOpen, initialPreset]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownloadSingle = async (format: SocialKitFormat) => {
    if (downloadingId) return;
    setDownloadingId(format.id);
    onNotify?.(`Generating ${format.name}...`, "info");

    try {
      await downloadSocialKitItem(
        imageUrl,
        format,
        selectedPreset,
        paddingPercent,
        baseName
      );
      onNotify?.(`Downloaded ${format.name}!`, "success");
    } catch (err: any) {
      console.error("[SOCIAL_KIT_DOWNLOAD_ERROR]", err);
      onNotify?.("Failed to generate social media export.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAllZip = async () => {
    if (isZipping) return;
    setIsZipping(true);
    onNotify?.("Bundling all social kit formats into ZIP...", "info");

    try {
      await downloadSocialKitZip(
        imageUrl,
        selectedPreset,
        paddingPercent,
        baseName
      );
      onNotify?.("Social Media Kit ZIP downloaded successfully!", "success");
    } catch (err: any) {
      console.error("[ZIP_DOWNLOAD_ERROR]", err);
      onNotify?.("Failed to generate ZIP bundle.", "error");
    } finally {
      setIsZipping(false);
    }
  };

  const getFormatIcon = (formatId: string) => {
    switch (formatId) {
      case "instagram-post":
        return <Instagram size={18} className="text-pink-400" />;
      case "instagram-story":
        return <Smartphone size={18} className="text-purple-400" />;
      case "youtube-thumbnail":
        return <Youtube size={18} className="text-red-400" />;
      case "linkedin-profile":
        return <Linkedin size={18} className="text-blue-400" />;
      default:
        return <Layers size={18} className="text-accent" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-[24px] bg-[#0E142A]/95 border border-primary/40 shadow-[0_24px_64px_rgba(0,0,0,0.8),0_0_40px_rgba(79,124,255,0.25)] overflow-hidden">
        {/* Top Glow Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#131A3A]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-chip bg-primary/20 border border-primary/40 flex items-center justify-center text-accent shadow-[0_0_15px_rgba(79,124,255,0.4)]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-heading font-bold text-white flex items-center gap-2">
                <span>Social Media Kit Generator</span>
                <span className="px-2 py-0.5 rounded-pill bg-accent/15 border border-accent/40 text-[10px] font-bold text-accent">
                  Phase 3 AI
                </span>
              </h3>
              <p className="text-xs text-text-secondary">
                Auto-centered framing with smart proportional padding across all major platforms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-btn text-text-secondary hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Toolbar: Smart Background & Padding Controls */}
        <div className="px-6 py-3.5 border-b border-white/[0.08] bg-[#0A0B1E]/90 flex flex-wrap items-center justify-between gap-4">
          {/* Smart Background Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <Layers size={13} className="text-accent" />
              <span>Background:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {recommendedPresets.map((preset) => {
                const isSelected = selectedPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset)}
                    className={`px-3 py-1 rounded-pill text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-primary text-white border border-accent/60 shadow-[0_0_12px_rgba(79,124,255,0.6)]"
                        : "bg-white/[0.05] hover:bg-white/10 text-text-secondary hover:text-white border border-white/10"
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full border border-white/20 ${preset.previewBg}`}
                    />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smart Padding Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary flex items-center gap-1">
              <Sliders size={13} className="text-accent" />
              <span>Smart Padding:</span>
            </span>
            <div className="inline-flex rounded-pill bg-[#131A3A] p-0.5 border border-white/10">
              {[
                { label: "Fit (0%)", val: 0 },
                { label: "Balanced (8%)", val: 8 },
                { label: "Spacious (15%)", val: 15 },
              ].map((pad) => (
                <button
                  key={pad.val}
                  onClick={() => setPaddingPercent(pad.val)}
                  className={`px-2.5 py-1 rounded-pill text-[11px] font-semibold transition-all cursor-pointer ${
                    paddingPercent === pad.val
                      ? "bg-accent text-[#0A0B1E] shadow-[0_0_10px_rgba(34,211,238,0.5)] font-bold"
                      : "text-text-secondary hover:text-white"
                  }`}
                >
                  {pad.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Formats Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOCIAL_MEDIA_FORMATS.map((format) => {
            const isDownloading = downloadingId === format.id;

            return (
              <div
                key={format.id}
                className="rounded-[18px] bg-[#131A3A]/70 border border-white/10 hover:border-primary/50 p-4 flex flex-col justify-between gap-3.5 transition-all duration-200 group relative shadow-lg"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFormatIcon(format.id)}
                    <span className="text-xs font-bold text-white truncate">
                      {format.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-pill bg-white/[0.06] border border-white/10 text-[10px] font-mono text-accent">
                    {format.aspectRatio}
                  </span>
                </div>

                {/* Canvas Live Visual Preview Card */}
                <div
                  className="relative w-full aspect-square rounded-[14px] overflow-hidden border border-white/15 flex items-center justify-center checkerboard-pattern"
                  style={
                    selectedPreset.id !== "transparent"
                      ? { background: selectedPreset.value }
                      : undefined
                  }
                >
                  <img
                    src={imageUrl}
                    alt={format.name}
                    className="w-full h-full object-contain filter drop-shadow-md transition-all duration-300"
                    style={{
                      padding: `${paddingPercent}%`,
                    }}
                  />
                  {/* Resolution Tag */}
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-pill bg-black/75 backdrop-blur-sm text-[9px] font-mono text-white/80 border border-white/10">
                    {format.width} × {format.height}
                  </div>
                </div>

                {/* Description */}
                <div className="text-[11px] text-text-secondary leading-snug">
                  {format.description}
                </div>

                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadSingle(format)}
                  disabled={isDownloading || isZipping}
                  className="w-full py-2 px-3 rounded-btn text-xs font-heading font-semibold text-white bg-white/[0.08] hover:bg-primary/30 border border-white/15 hover:border-primary/50 shadow-sm hover:shadow-[0_0_15px_rgba(79,124,255,0.4)] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-accent" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Download {format.aspectRatio}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0A0B1E]/95 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Check size={14} className="text-status-success" />
            <span>Lossless PNG rendering with crisp auto-centered alignment</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-btn text-xs font-medium text-text-secondary hover:text-white bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>

            {/* Master Batch ZIP Download */}
            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isZipping || Boolean(downloadingId)}
              className="px-5 py-2.5 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-accent via-primary to-secondary shadow-[0_0_24px_rgba(34,211,238,0.5)] hover:shadow-[0_0_32px_rgba(34,211,238,0.7)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isZipping ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Packaging ZIP Kit...</span>
                </>
              ) : (
                <>
                  <Archive size={14} />
                  <span>Download All Formats (.ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
