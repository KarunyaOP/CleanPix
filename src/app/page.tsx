"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/components/providers/AuthProvider";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/splash/SplashScreen";
import { LoginForm } from "@/components/auth/LoginForm";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { FeaturesSection } from "@/components/marketing/FeaturesSection";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { FaqSection } from "@/components/marketing/FaqSection";
import { Footer } from "@/components/layout/Footer";
import { InstallPromptBanner } from "@/components/pwa/InstallPromptBanner";

export default function HomePage() {
  const { status } = useSession();
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

  // Keep track of whether the main workspace has ever been active
  const hasEverBeenActiveRef = React.useRef<boolean>(false);

  useEffect(() => {
    try {
      const splashSeen = sessionStorage.getItem("cleanpix_splash_seen");
      const guestMode = sessionStorage.getItem("cleanpix_guest_mode") === "true";
      if (guestMode) {
        setIsGuest(true);
      }

      if (status === "authenticated" || guestMode) {
        setShowSplash(false);
        setHasInitialized(true);
      } else if (status === "unauthenticated") {
        if (splashSeen === "true") {
          setShowSplash(false);
        } else {
          setShowSplash((prev) => (prev === false ? false : true));
        }
        setHasInitialized(true);
      }
    } catch {
      setShowSplash(false);
      setHasInitialized(true);
    }
  }, [status]);

  const handleSplashComplete = () => {
    try {
      sessionStorage.setItem("cleanpix_splash_seen", "true");
    } catch {
      // Ignore storage errors
    }
    setShowSplash(false);
  };

  const handleContinueAsGuest = () => {
    try {
      sessionStorage.setItem("cleanpix_guest_mode", "true");
      sessionStorage.setItem("cleanpix_splash_seen", "true");
    } catch {
      // Ignore
    }
    setIsGuest(true);
    setShowSplash(false);
    setHasInitialized(true);
  };

  const isAccessAllowed = status === "authenticated" || isGuest || hasEverBeenActiveRef.current;

  if (isAccessAllowed && (status === "authenticated" || isGuest)) {
    hasEverBeenActiveRef.current = true;
  }

  // 1. If access is granted (authenticated or guest), ALWAYS render the main app and NEVER unmount it
  if (isAccessAllowed) {
    return (
      <main className="flex-1 flex flex-col" id="top">
        <Navbar />
        <Hero />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <FaqSection />
        <Footer />
        <InstallPromptBanner />
      </main>
    );
  }

  // 2. While initial auth/splash state is resolving on first load:
  // Do NOT treat the user as unauthenticated and never prematurely render the login form.
  if (!hasInitialized || status === "loading" || showSplash === null) {
    if (showSplash === true) {
      return (
        <main className="relative min-h-screen bg-[#0A0B1E] flex flex-col items-center justify-center select-none overflow-hidden">
          <SplashScreen onComplete={handleSplashComplete} durationMs={2550} />
        </main>
      );
    }
    return <div className="min-h-screen bg-[#0A0B1E]" aria-hidden="true" />;
  }

  // 3. User is unauthenticated and not in guest mode -> Render Login Form
  return (
    <main className="relative min-h-screen bg-[#0A0B1E] flex flex-col items-center justify-center px-4 sm:px-6 py-12 select-none overflow-hidden">
      <LoginForm
        onContinueAsGuest={handleContinueAsGuest}
        animateEntrance={true}
      />

      {/* Coordinated Splash Screen with AnimatePresence Exit */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            onComplete={handleSplashComplete}
            durationMs={2550}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
