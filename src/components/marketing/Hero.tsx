"use client";

import React, { useState } from "react";
import { ValidationToast } from "@/components/upload/ValidationToast";
import { LeftColumnResults } from "@/components/upload/LeftColumnResults";
import { ProcessedPreviewCard } from "@/components/editor/ProcessedPreviewCard";
import { LandingDetectedPanel } from "@/components/editor/LandingDetectedPanel";
import { ToastNotification } from "@/components/upload/ToastNotification";
import { SocialMediaKitModal } from "@/components/editor/SocialMediaKitModal";
import { useUpload } from "@/hooks/useUpload";
import { SmartBackgroundPreset } from "@/types/schema";
import { TRANSPARENT_PRESET } from "@/utils/backgroundPresets";
import { WatchDemoModal } from "@/components/marketing/WatchDemoModal";
import { TemplatesModal } from "@/components/marketing/TemplatesModal";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";
import {
  UploadCloud,
  Play,
  Layers,
  Zap,
  ShieldCheck,
  Smile,
  Lock,
  Sparkles,
} from "lucide-react";

export const Hero: React.FC = () => {
  const {
    file,
    previewUrl,
    processedUrl,
    hdUrl,
    isHdReady,
    isEnhancingHd,
    hdError,
    detectedObject,
    dimensions,
    isUploading,
    isProcessingAI,
    uploadProgress,
    error,
    toast,
    isDragging,
    fileInputRef,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFilePicker,
    resetUpload,
    clearError,
    showToast,
    dismissToast,
    selectFile,
    startBackgroundRemoval,
    startHdEnhancement,
    copyToClipboard,
    downloadCutout,
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    framing,
    setFraming,
  } = useUpload();

  const [isSocialKitOpen, setIsSocialKitOpen] = useState<boolean>(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState<boolean>(false);
  const [landingPreset, setLandingPreset] = useState<SmartBackgroundPreset>(TRANSPARENT_PRESET);
  const [landingPadding, setLandingPadding] = useState<number>(0);

  const trustFeatures = [
    {
      id: "fast",
      icon: Zap,
      title: "Fast Processing",
    },
    {
      id: "quality",
      icon: ShieldCheck,
      title: "High-Quality Results",
    },
    {
      id: "no-install",
      icon: Smile,
      title: "No Installation Needed",
    },
    {
      id: "privacy",
      icon: Lock,
      title: "Your Privacy Matters",
    },
  ];

  return (
    <section className="relative pt-4 sm:pt-12 pb-20 sm:pb-32 overflow-hidden">
      {/* Hidden file input controlled by useUpload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Floating System Toast Notifications */}
      <ToastNotification toast={toast} onDismiss={dismissToast} />

      {/* Watch 10s Demo Animated Walkthrough Modal */}
      <WatchDemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onUploadClick={openFilePicker}
      />

      {/* Explore Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={(templateName) => {
          showToast(`Selected template: ${templateName}. Please upload an image to apply.`, "info");
          openFilePicker();
        }}
      />

      {/* Social Media Kit Generator Modal (Results Page Only) */}
      {processedUrl && (
        <SocialMediaKitModal
          isOpen={isSocialKitOpen}
          onClose={() => setIsSocialKitOpen(false)}
          imageUrl={isHdReady && hdUrl ? hdUrl : processedUrl}
          fileName={file?.name || "cleanpix_cutout.png"}
          detectedCategory={detectedObject}
          initialPreset={landingPreset}
          onNotify={showToast}
        />
      )}

      {/* Out of Credits Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-10 lg:px-16">
        {/* Validation Error Toast */}
        <ValidationToast error={error} onDismiss={clearError} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* LEFT COLUMN: Results Page Navigation & Options OR Landing Page Copy & Upload Zone */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-start text-left z-10">
            {file && previewUrl ? (
              /* RESULTS PAGE: Left Column with Single Back Button & Cards */
              <div className="w-full">
                <LeftColumnResults
                  file={file}
                  previewUrl={previewUrl}
                  processedUrl={processedUrl}
                  detectedCategory={detectedObject}
                  dimensions={dimensions}
                  isUploading={isUploading}
                  isProcessingAI={isProcessingAI}
                  uploadProgress={uploadProgress}
                  isHdReady={isHdReady}
                  isEnhancingHd={isEnhancingHd}
                  hdError={hdError}
                  error={error}
                  onBack={resetUpload}
                  onChangeImage={openFilePicker}
                  onRemoveImage={resetUpload}
                  onRemoveBackground={() => startBackgroundRemoval(landingPadding)}
                  onDownloadStandard={() => downloadCutout("standard")}
                  onEnhanceHd={startHdEnhancement}
                  onDownloadHd={() => downloadCutout("hd")}
                  onOpenSocialKit={() => setIsSocialKitOpen(true)}
                  onClearError={clearError}
                />
              </div>
            ) : (
              /* LANDING PAGE: Hero Section, Upload / Watch Demo / Explore Templates Buttons & Feature Icons */
              <>
                {/* Eyebrow Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-pill bg-[#131A3A]/80 border border-primary/35 backdrop-blur-xl shadow-[0_0_20px_rgba(79,124,255,0.25)] mb-4 sm:mb-6 animate-in fade-in duration-300">
                  <Sparkles size={14} className="text-accent animate-pulse" />
                  <span className="text-xs font-semibold text-[#F8FAFC] tracking-wide">
                    AI Powered <span className="text-white/40 mx-1.5">•</span> 100% Automated
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-[58px] leading-[1.1] tracking-tight text-[#F8FAFC] mb-4 sm:mb-6 break-words">
                  Remove Backgrounds <br className="hidden sm:inline" />
                  <span className="text-gradient-cyan drop-shadow-[0_0_35px_rgba(34,211,238,0.4)]">
                    in Seconds
                  </span>
                </h1>

                {/* Subcopy */}
                <p className="text-sm sm:text-base lg:text-lg text-text-secondary leading-relaxed max-w-lg mb-6 sm:mb-8 font-normal">
                  Turn your photos into stunning visuals with our AI-powered background
                  remover. No skills. No hassle. Just results.
                </p>

                {/* INTERACTIVE DRAG-AND-DROP ZONE CONTAINER */}
                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={openFilePicker}
                  className={`w-full rounded-[22px] border-2 transition-all duration-200 cursor-pointer p-4 sm:p-6 mb-3 relative overflow-hidden group select-none ${
                    isDragging
                      ? "border-primary bg-primary/15 shadow-[0_0_40px_rgba(79,124,255,0.7),inset_0_0_20px_rgba(79,124,255,0.3)] scale-[1.02]"
                      : "border-dashed border-primary/40 bg-[#131A3A]/60 hover:border-primary/80 hover:bg-[#131A3A]/85 hover:shadow-[0_0_30px_rgba(79,124,255,0.25)] backdrop-blur-xl"
                  }`}
                >
                  {isDragging ? (
                    /* ACTIVE DRAG-OVER STATE */
                    <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in-95 duration-150">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-[0_0_30px_rgba(79,124,255,0.9)] mb-3 animate-bounce">
                        <UploadCloud size={32} />
                      </div>
                      <h3 className="text-lg sm:text-xl font-heading font-bold text-white mb-1">
                        Drop your image here
                      </h3>
                      <p className="text-xs text-accent font-medium">
                        Release to upload & validate JPG, PNG, or WEBP
                      </p>
                    </div>
                  ) : (
                    /* DEFAULT REST STATE WITH BUTTONS AND HELPER TEXT */
                    <div className="flex flex-col items-start gap-4">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        {/* 1. Primary Action: Upload Image */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFilePicker();
                          }}
                          className="group/btn relative inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-btn font-heading font-bold text-sm sm:text-base text-white bg-gradient-to-r from-[#4F7CFF] to-[#8B5CF6] shadow-[0_0_30px_rgba(79,124,255,0.6),0_0_60px_rgba(139,92,246,0.3)] hover:shadow-[0_0_45px_rgba(79,124,255,0.8),0_0_80px_rgba(139,92,246,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer overflow-hidden min-h-[46px]"
                        >
                          <div className="absolute inset-x-0 top-0 h-px bg-white/40 pointer-events-none" />
                          <UploadCloud size={19} className="group-hover/btn:scale-110 transition-transform duration-200 shrink-0" />
                          <span>Upload Image</span>
                        </button>

                        {/* 2. Secondary Action 1: Watch 10s Demo */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsDemoModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-btn font-medium text-xs sm:text-sm text-[#F8FAFC] bg-[#0A0B1E]/70 border border-white/15 backdrop-blur-md hover:border-accent/40 hover:bg-[#1B2350]/90 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-200 cursor-pointer min-h-[44px]"
                        >
                          <Play size={14} className="fill-current text-accent shrink-0" />
                          <span>Watch 10s Demo</span>
                        </button>

                        {/* 3. Secondary Action 2: Explore Templates */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTemplatesModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-btn font-medium text-xs sm:text-sm text-[#F8FAFC] bg-[#0A0B1E]/70 border border-white/15 backdrop-blur-md hover:border-primary/40 hover:bg-[#1B2350]/90 hover:shadow-[0_0_20px_rgba(79,124,255,0.2)] transition-all duration-200 cursor-pointer min-h-[44px]"
                        >
                          <Layers size={14} className="text-accent shrink-0" />
                          <span>Explore Templates</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] sm:text-xs text-text-muted font-medium tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent/70 shrink-0" />
                        <span>or drag and drop anywhere in box (Ctrl + V supported)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Format & Size Caption */}
                <p className="text-[11px] sm:text-xs text-text-muted font-medium mb-6 sm:mb-10 pl-1 tracking-wide">
                  JPG, PNG, WEBP <span className="mx-1">•</span> Max 10MB
                </p>

                {/* 4-Item Feature Icons / Trust Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 w-full pt-5 sm:pt-6 border-t border-white/[0.1]">
                  {trustFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div
                        key={feature.id}
                        className="flex flex-col items-start gap-2 group cursor-default"
                      >
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-chip bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:text-accent group-hover:border-accent/50 group-hover:shadow-[0_0_16px_rgba(79,124,255,0.4)] transition-all duration-200 shrink-0">
                          <Icon size={16} />
                        </div>
                        <span className="text-[11px] sm:text-xs font-semibold text-text-secondary group-hover:text-[#F8FAFC] transition-colors leading-tight">
                          {feature.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Results Preview + Copy PNG OR Landing Preview + Detected Product Panel */}
          <div className="lg:col-span-6 xl:col-span-7 flex items-center justify-center lg:justify-end z-10 mt-4 lg:mt-0 w-full">
            {file && previewUrl ? (
              /* RESULTS PAGE: Large Processed Image Preview + Copy Transparent PNG Section */
              <div className="w-full max-w-[720px] flex flex-col gap-4">
                <ProcessedPreviewCard
                  key={isHdReady && hdUrl ? hdUrl : previewUrl}
                  originalUrl={previewUrl}
                  processedUrl={isHdReady && hdUrl ? hdUrl : processedUrl}
                  isProcessing={isProcessingAI}
                  isHd={isHdReady}
                  onCopyClipboard={() => copyToClipboard(isHdReady && hdUrl ? hdUrl : (processedUrl || undefined))}
                  detectedCategory={detectedObject}
                  showCopySection={true}
                />
              </div>
            ) : (
              /* LANDING PAGE: Static Before / After Demo Showcase + Compact Smart Recommendation Panel */
              <div className="w-full max-w-[720px] flex flex-col gap-4">
                <ProcessedPreviewCard
                  originalUrl="/images/hero-original.jpg"
                  processedUrl="/images/hero-cutout.jpg"
                  isProcessing={false}
                  onCopyClipboard={async () => {}}
                  detectedCategory="person"
                  showCopySection={false}
                  activePreset={landingPreset}
                  paddingPercent={landingPadding}
                />
                <LandingDetectedPanel
                  detectedCategory="person"
                  activePreset={landingPreset}
                  onSelectPreset={setLandingPreset}
                  paddingPercent={landingPadding}
                  onPaddingChange={(pad) => {
                    setLandingPadding(pad);
                    setFraming(pad);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
