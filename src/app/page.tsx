"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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

export default function HomePage() {
  const { data: session, status } = useSession();
  const [showSplash, setShowSplash] = useState<boolean | null>(null);
  const [viewMode, setViewMode] = useState<"login" | "home">("login");

  useEffect(() => {
    // Check if splash has already been seen in this session
    try {
      const splashSeen = sessionStorage.getItem("cleanpix_splash_seen");
      if (splashSeen === "true") {
        setShowSplash(false);
        setViewMode("home");
      } else {
        setShowSplash(true);
        setViewMode("login");
      }
    } catch {
      // In case sessionStorage is unavailable
      setShowSplash(false);
      setViewMode("home");
    }
  }, []);

  const handleSplashComplete = () => {
    try {
      sessionStorage.setItem("cleanpix_splash_seen", "true");
    } catch {
      // Ignore storage errors
    }

    // If already authenticated, switch view mode to home; otherwise keep login
    if (status === "authenticated") {
      setViewMode("home");
    } else {
      setViewMode("login");
    }
    // Triggers smooth dissolution exit animation via AnimatePresence
    setShowSplash(false);
  };

  const handleContinueAsGuest = () => {
    try {
      sessionStorage.setItem("cleanpix_guest_mode", "true");
    } catch {
      // Ignore
    }
    setViewMode("home");
  };

  // 1. Initial hydration mount check
  if (showSplash === null) {
    return <div className="min-h-screen bg-[#0A0B1E]" aria-hidden="true" />;
  }

  // 2. Login View with Pre-rendered Login Form and AnimatePresence Splash Exit
  if (viewMode === "login" && status !== "authenticated") {
    return (
      <main className="relative min-h-screen bg-[#0A0B1E] flex flex-col items-center justify-center px-4 sm:px-6 py-12 select-none overflow-hidden">
        {/* Pre-rendered Login Form */}
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

  // 3. Home Page: Full application (Navbar, Hero, Features, etc.)
  return (
    <main className="flex-1 flex flex-col" id="top">
      <Navbar />
      <Hero />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FaqSection />
      <Footer />
    </main>
  );
}
