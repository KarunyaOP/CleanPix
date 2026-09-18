"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Download,
  Layers,
  ArrowRight,
} from "lucide-react";

interface WatchDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadClick: () => void;
}

export const WatchDemoModal: React.FC<WatchDemoModalProps> = ({
  isOpen,
  onClose,
  onUploadClick,
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);

  const steps = [
    {
      id: 0,
      title: "1. Upload Photo",
      desc: "Drag & drop any JPG, PNG, or WEBP portrait or product.",
      icon: UploadCloud,
      durationMs: 2500,
    },
    {
      id: 1,
      title: "2. AI Processing",
      desc: "Neural network detects subject and maps hair & edge alpha channels.",
      icon: Sparkles,
      durationMs: 2500,
    },
    {
      id: 2,
      title: "3. Background Removed",
      desc: "Instant transparent PNG with smart studio & solid presets.",
      icon: CheckCircle2,
      durationMs: 2500,
    },
    {
      id: 3,
      title: "4. One-Click Export",
      desc: "Download lossless standard or enhanced HD 4K cutouts.",
      icon: Download,
      durationMs: 2500,
    },
  ];

  // Auto-playing 10s timeline
  useEffect(() => {
    if (!isOpen) {
      setActiveStep(0);
      setProgress(0);
      return;
    }

    if (!isPlaying) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0; // Loop or hold
        }
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying]);

  // Sync active step with progress (0-25%: step 0, 25-50%: step 1, 50-75%: step 2, 75-100%: step 3)
  useEffect(() => {
    const stepIndex = Math.min(3, Math.floor(progress / 25));
    setActiveStep(stepIndex);
  }, [progress]);

  // ESC key listener
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#05060F]/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="10-Second CleanPix Demo Walkthrough"
    >
      <div
        className="relative w-full max-w-[680px] rounded-[28px] bg-[#131A3A]/95 border border-primary/40 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(79,124,255,0.25)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0A0B1E]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-accent shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              <Play size={14} className="fill-current text-accent" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">
                10-Second Interactive Demo
              </h3>
              <p className="text-xs text-text-secondary">
                See CleanPix AI background removal in action
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Interactive Walkthrough Visual Stage */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {/* Main Visual Display Frame */}
          <div className="relative aspect-video w-full rounded-[20px] border border-white/15 bg-[#0A0B1E] overflow-hidden flex items-center justify-center shadow-inner">
            {/* Ambient Lighting Mesh */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 via-transparent to-accent/10 pointer-events-none" />

            {/* STEP 0: Upload Demo */}
            {activeStep === 0 && (
              <div className="flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-[0_0_30px_rgba(79,124,255,0.8)] mb-3 animate-bounce">
                  <UploadCloud size={30} />
                </div>
                <h4 className="font-heading font-bold text-lg text-white mb-1">
                  1. Drag & Drop or Select
                </h4>
                <p className="text-xs text-text-secondary max-w-xs">
                  Instant client validation for JPEG, PNG & WebP images up to 10MB.
                </p>
              </div>
            )}

            {/* STEP 1: AI Processing Demo */}
            {activeStep === 1 && (
              <div className="relative w-full h-full flex items-center justify-center p-4 animate-in fade-in duration-200">
                <img
                  src="/images/hero-original.jpg"
                  alt="Original Source"
                  className="w-full h-full object-contain filter brightness-90"
                />
                {/* Scanning Laser Line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent shadow-[0_0_20px_#00F0FF] animate-pulse top-1/2 -translate-y-1/2" />
                <div className="absolute top-4 right-4 px-3 py-1 rounded-pill bg-[#0A0B1E]/90 border border-primary/50 text-xs font-mono text-accent flex items-center gap-1.5 shadow-lg">
                  <Sparkles size={12} className="animate-spin" />
                  <span>AI Alpha Edge Mapping...</span>
                </div>
              </div>
            )}

            {/* STEP 2: Background Removed Cutout */}
            {activeStep === 2 && (
              <div className="relative w-full h-full checkerboard-pattern flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                <img
                  src="/images/hero-cutout.jpg"
                  alt="Transparent Cutout"
                  className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
                />
                <div className="absolute top-4 left-4 px-3 py-1 rounded-pill bg-status-success/20 border border-status-success/40 text-xs font-bold text-status-success flex items-center gap-1.5 shadow-lg">
                  <CheckCircle2 size={13} />
                  <span>100% Background Removed</span>
                </div>
              </div>
            )}

            {/* STEP 3: Instant Export / Kit */}
            {activeStep === 3 && (
              <div className="relative w-full h-full bg-gradient-to-br from-[#182042] to-[#0E142A] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-status-success/20 border border-status-success/40 flex items-center justify-center text-status-success shadow-[0_0_24px_rgba(34,197,94,0.4)] mb-3">
                  <Download size={26} />
                </div>
                <h4 className="font-heading font-bold text-lg text-white mb-1">
                  Ready to Download Lossless PNG & 4K HD
                </h4>
                <p className="text-xs text-text-secondary max-w-sm mb-2">
                  Copy directly to clipboard or export preset kits for Instagram, LinkedIn & E-commerce.
                </p>
              </div>
            )}
          </div>

          {/* Stepper Progress Bar & Tabs */}
          <div className="space-y-3">
            {/* Continuous 10s Timeline Scrubber */}
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* 4 Step Clickable Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      setActiveStep(step.id);
                      setProgress(step.id * 25 + 5);
                    }}
                    className={`p-2.5 rounded-[14px] text-left transition-all cursor-pointer border flex flex-col gap-1 ${
                      isActive
                        ? "bg-primary/20 border-accent/60 shadow-[0_0_16px_rgba(34,211,238,0.25)]"
                        : "bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon
                        size={13}
                        className={isActive ? "text-accent" : "text-text-muted"}
                      />
                      <span
                        className={`text-[11px] font-bold ${
                          isActive ? "text-white" : "text-text-secondary"
                        }`}
                      >
                        {step.title.split(" ")[1]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls & Bottom Action Bar */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-pill bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-semibold text-text-secondary hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProgress(0);
                  setActiveStep(0);
                  setIsPlaying(true);
                }}
                className="p-1.5 rounded-pill bg-white/[0.05] hover:bg-white/10 border border-white/10 text-text-secondary hover:text-white transition-colors cursor-pointer"
                title="Restart walkthrough"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onUploadClick();
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-btn font-heading font-bold text-xs text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(79,124,255,0.55)] hover:shadow-[0_0_30px_rgba(79,124,255,0.8)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Try It Now (Upload Image)</span>
              <ArrowRight size={13} className="text-accent" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
