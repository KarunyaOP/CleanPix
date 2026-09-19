"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, X, Smartphone, Share2, Info } from "lucide-react";

export const InstallPromptBanner: React.FC = () => {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosInstructions, setShowIosInstructions] = useState<boolean>(false);
  const [showDesktopHint, setShowDesktopHint] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode (already installed as PWA)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if dismissed in this session
    try {
      const dismissed = sessionStorage.getItem("cleanpix_pwa_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
        return;
      }
    } catch {
      // Ignore storage error
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen to beforeinstallprompt (Android Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Mount banner on landing page and make visible
    setIsMounted(true);
    setIsVisible(true);

    // 5-second automatic close countdown
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
    setIsDismissed(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("cleanpix_pwa_dismissed", "true");
      }
    } catch {
      // Ignore storage error
    }
  };

  const handleInstallClick = async () => {
    // Clear auto-close timer so user has time to view instructions or prompt
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (deferredPrompt) {
      // Trigger native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        handleDismiss();
      }
    } else if (isIos) {
      setShowIosInstructions((prev) => !prev);
    } else {
      setShowDesktopHint((prev) => !prev);
    }
  };

  // Do not render before client mount, if already installed, or if dismissed
  if (!isMounted || isStandalone || isDismissed || !isVisible) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-label="Install CleanPix App"
      className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 p-4 pt-4.5 rounded-[22px] bg-[#131A3A]/95 border border-primary/40 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_24px_rgba(79,124,255,0.3)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 select-none pointer-events-auto overflow-hidden"
    >
      {/* 5-second animated countdown progress line */}
      <div className="absolute top-0 inset-x-0 h-[2.5px] bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary via-accent to-secondary"
          style={{
            animation: "pwaCountdown 5s linear forwards",
          }}
        />
      </div>

      <div className="flex items-start gap-3.5 mt-0.5">
        {/* App Icon */}
        <div className="w-11 h-11 rounded-[14px] bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shrink-0 shadow-[0_0_16px_rgba(79,124,255,0.5)] p-1.5">
          <img
            src="/branding/logo/cleanpix-icon.svg"
            alt="CleanPix Icon"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-heading font-bold text-sm text-white truncate">
              Install CleanPix App
            </span>
            <span className="px-1.5 py-0.2 rounded-pill bg-primary/25 border border-primary/40 text-[9px] font-bold text-accent">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            {isIos
              ? "Add CleanPix to your Home Screen for faster 1-tap cutout editing."
              : "Install for full-screen editing, offline history, and quick access."}
          </p>

          {/* iOS Safari instructions */}
          {showIosInstructions && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] text-white/90 space-y-1 animate-in fade-in duration-150">
              <p className="flex items-center gap-1.5 font-semibold text-accent">
                <Share2 size={12} />
                <span>To install on iPhone/iPad:</span>
              </p>
              <p className="text-[10px] text-text-secondary">
                1. Tap the <strong className="text-white">Share</strong> button in Safari toolbar.
              </p>
              <p className="text-[10px] text-text-secondary">
                2. Select <strong className="text-white">Add to Home Screen</strong>.
              </p>
            </div>
          )}

          {/* Desktop instructions */}
          {showDesktopHint && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-[11px] text-white/90 space-y-1 animate-in fade-in duration-150">
              <p className="flex items-center gap-1.5 font-semibold text-accent">
                <Info size={12} />
                <span>To install in your browser:</span>
              </p>
              <p className="text-[10px] text-text-secondary">
                Click the <strong className="text-white">Install (⊕)</strong> icon in your browser address bar.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="py-1.5 px-3.5 rounded-btn text-xs font-heading font-bold text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_16px_rgba(79,124,255,0.5)] hover:shadow-[0_0_24px_rgba(79,124,255,0.75)] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isIos ? (
                <>
                  <Smartphone size={13} />
                  <span>How to Install</span>
                </>
              ) : (
                <>
                  <Download size={13} />
                  <span>Install Now</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="py-1.5 px-3 rounded-btn text-xs font-semibold text-text-secondary hover:text-white transition-colors cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-full text-text-muted hover:text-white transition-colors cursor-pointer shrink-0"
          aria-label="Close install prompt"
        >
          <X size={16} />
        </button>
      </div>
    </aside>
  );
};
