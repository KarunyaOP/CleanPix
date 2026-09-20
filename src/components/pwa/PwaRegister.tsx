"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

export const PwaRegister: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "offline" | "online" } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Capture beforeinstallprompt event globally as early as possible
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__cleanpix_deferred_prompt = e;
      window.dispatchEvent(new CustomEvent("cleanpix_pwa_installable", { detail: e }));
    };

    const handleAppInstalled = () => {
      (window as any).__cleanpix_deferred_prompt = null;
      window.dispatchEvent(new CustomEvent("cleanpix_pwa_installed"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 2. Register Service Worker reliably in production and local testing
    const registerServiceWorker = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });

          // Check for service worker updates
          registration.addEventListener("updatefound", () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener("statechange", () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New SW available
                }
              });
            }
          });
        } catch (error) {
          console.warn("[PWA] Service Worker registration failed:", error);
        }
      }
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    // 3. Network connectivity listeners
    const handleOnline = () => {
      setIsOffline(false);
      setToastMessage({ text: "You are back online!", type: "online" });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setToastMessage({ text: "Internet connection lost. Offline mode active.", type: "offline" });
      setShowToast(true);
    };

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showToast && !isOffline) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-[16px] backdrop-blur-2xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200">
      {toastMessage?.type === "offline" || isOffline ? (
        <div className="bg-red-500/20 border border-red-500/40 text-red-200 px-3.5 py-1.5 rounded-pill flex items-center gap-2">
          <WifiOff size={14} className="text-red-400 shrink-0" />
          <span>No internet connection</span>
        </div>
      ) : (
        <div className="bg-status-success/20 border border-status-success/40 text-green-200 px-3.5 py-1.5 rounded-pill flex items-center gap-2">
          <Wifi size={14} className="text-status-success shrink-0" />
          <span>Connected to network</span>
        </div>
      )}
    </div>
  );
};
