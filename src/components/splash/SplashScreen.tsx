"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 2550,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Auto-complete timer based on duration (triggers after logo animation and final sparkle pulse)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFinish();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, handleFinish]);

  // Keyboard skip listener (ESC, Space, Enter) for instant skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFinish();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFinish]);

  return (
    <motion.div
      onClick={handleFinish}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: shouldReduceMotion ? 1 : 1.03,
        filter: shouldReduceMotion ? "none" : "blur(6px)",
        transition: {
          duration: shouldReduceMotion ? 0.25 : 0.4,
          ease: [0.16, 1, 0.3, 1],
        },
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A0B1E] overflow-hidden select-none cursor-pointer"
      role="dialog"
      aria-label="CleanPix Introduction"
      aria-modal="true"
    >
      {/* Ambient Lighting Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-Left Cyan Glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: shouldReduceMotion ? 0.35 : [0.2, 0.38, 0.48, 0.35],
            scale: shouldReduceMotion ? 1 : [0.85, 1.05, 1.12, 1],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-24 -left-24 w-[500px] h-[500px] rounded-full bg-[#00F0FF]/25 blur-[120px]"
        />

        {/* Center-Right Purple Glow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: shouldReduceMotion ? 0.3 : [0.2, 0.32, 0.42, 0.3],
            scale: shouldReduceMotion ? 1 : [1, 1.15, 1.2, 1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          className="absolute top-1/4 -right-24 w-[550px] h-[550px] rounded-full bg-[#8B5CF6]/25 blur-[130px]"
        />

        {/* Bottom-Center Deep Indigo Pool */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          transition={{ duration: 0.8 }}
          className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#6366F1]/20 blur-[130px]"
        />

        {/* Vignette Edge Shading */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#05060F_90%)] opacity-80" />
      </div>

      {/* Central Animation Canvas & Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        {/* 1. Main SVG Emblem Container */}
        <motion.div
          initial={{ scale: shouldReduceMotion ? 1 : 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: shouldReduceMotion ? 0.4 : 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center"
        >
          {shouldReduceMotion ? (
            /* Accessible Reduced-Motion Static Logo */
            <img
              src="/branding/logo/cleanpix-icon.svg"
              alt="CleanPix Emblem"
              className="w-full h-full object-contain drop-shadow-[0_0_35px_rgba(0,240,255,0.6)]"
            />
          ) : (
            /* GPU-Accelerated Dynamic SVG Animation */
            <svg
              viewBox="0 0 512 512"
              className="w-full h-full overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Transparency Checkerboard Pattern */}
                <pattern
                  id="splashChecker"
                  width="16"
                  height="16"
                  patternUnits="userSpaceOnUse"
                >
                  <rect width="8" height="8" fill="#1E2442" />
                  <rect x="8" width="8" height="8" fill="#13172E" />
                  <rect y="8" width="8" height="8" fill="#13172E" />
                  <rect x="8" width="8" height="8" fill="#1E2442" />
                </pattern>

                {/* Gradients */}
                <linearGradient
                  id="splashCGlassGrad"
                  x1="60"
                  y1="60"
                  x2="440"
                  y2="440"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#00F0FF" />
                  <stop offset="30%" stopColor="#38BDF8" />
                  <stop offset="65%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#D946EF" />
                </linearGradient>

                <linearGradient
                  id="splashInnerGlowGrad"
                  x1="120"
                  y1="100"
                  x2="380"
                  y2="400"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#818CF8" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#C084FC" stopOpacity="0.95" />
                </linearGradient>

                <linearGradient
                  id="splashSparkleGrad"
                  x1="360"
                  y1="180"
                  x2="460"
                  y2="280"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="35%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#818CF8" />
                </linearGradient>

                <linearGradient
                  id="splashOrbitGrad"
                  x1="80"
                  y1="360"
                  x2="440"
                  y2="160"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#C084FC" stopOpacity="0.15" />
                </linearGradient>

                <radialGradient
                  id="splashCenterGlow"
                  cx="240"
                  cy="240"
                  r="220"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#6366F1" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0A0B1E" stopOpacity="0" />
                </radialGradient>

                {/* Glass Glow Filter */}
                <filter
                  id="splashNeonGlow"
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="160%"
                >
                  <feGaussianBlur stdDeviation="10" result="blur" />
                  <feComposite
                    in="SourceGraphic"
                    in2="blur"
                    operator="over"
                  />
                </filter>

                <filter
                  id="splashSparkleGlow"
                  x="-60%"
                  y="-60%"
                  width="220%"
                  height="220%"
                >
                  <feGaussianBlur stdDeviation="7" result="blur" />
                  <feColorMatrix
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0.9  0 0 1 0 1  0 0 0 2.2 -0.1"
                  />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <clipPath id="splashInnerClip">
                  <circle cx="230" cy="256" r="105" />
                </clipPath>
              </defs>

              {/* 1. Ambient Center Glow with Final Pulse */}
              <motion.circle
                cx="240"
                cy="256"
                r="210"
                fill="url(#splashCenterGlow)"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{
                  opacity: shouldReduceMotion ? 0.35 : [0, 1, 1, 1.3, 1],
                  scale: shouldReduceMotion ? 1 : [0.6, 1, 1, 1.12, 1],
                }}
                transition={{
                  duration: shouldReduceMotion ? 0.4 : 2.4,
                  times: [0, 0.35, 0.8, 0.9, 1],
                  ease: "easeInOut",
                }}
              />

              {/* 2. Orbit Ring Tracing Around Logo */}
              <motion.ellipse
                cx="250"
                cy="270"
                rx="190"
                ry="85"
                transform="rotate(-20 250 270)"
                stroke="url(#splashOrbitGrad)"
                strokeWidth="3.5"
                fill="none"
                filter="url(#splashNeonGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.95 }}
                transition={{
                  duration: 0.8,
                  delay: 0.1,
                  ease: "easeInOut",
                }}
              />

              {/* 3. Glowing Orbital Particles */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <motion.circle
                  r="6"
                  fill="#FFFFFF"
                  filter="url(#splashSparkleGlow)"
                  animate={{
                    cx: [70, 250, 430, 250, 70],
                    cy: [220, 160, 310, 370, 220],
                    scale: [0.8, 1.3, 0.9, 1.2, 0.8],
                  }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                <motion.circle
                  r="4"
                  fill="#00F0FF"
                  animate={{
                    cx: [110, 290, 395, 210, 110],
                    cy: [200, 180, 335, 360, 200],
                  }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 0.1,
                  }}
                />
              </motion.g>

              {/* 4. Transparency Checkerboard Disc Fade-In */}
              <motion.g
                clipPath="url(#splashInnerClip)"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <rect
                  x="110"
                  y="136"
                  width="240"
                  height="240"
                  fill="url(#splashChecker)"
                />
                <circle
                  cx="230"
                  cy="256"
                  r="105"
                  stroke="#38BDF8"
                  strokeWidth="2.5"
                  strokeOpacity="0.5"
                  fill="none"
                />
              </motion.g>

              {/* 5. Glass "C" Ribbon Self-Drawing */}
              <motion.path
                d="M 335 150
                   C 285 100, 190 95, 125 155
                   C 60 215, 60 305, 120 365
                   C 185 425, 290 425, 345 365
                   C 365 343, 355 315, 325 315
                   C 280 315, 255 345, 210 345
                   C 155 345, 125 295, 130 255
                   C 135 205, 175 165, 230 165
                   C 270 165, 295 185, 325 185
                   C 355 185, 360 165, 335 150 Z"
                fill="url(#splashCGlassGrad)"
                stroke="url(#splashCGlassGrad)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#splashNeonGlow)"
                initial={{
                  pathLength: 0,
                  fillOpacity: 0,
                  opacity: 0,
                }}
                animate={{
                  pathLength: 1,
                  fillOpacity: 0.28,
                  opacity: 1,
                }}
                transition={{
                  pathLength: {
                    duration: 0.8,
                    delay: 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  },
                  fillOpacity: {
                    duration: 0.4,
                    delay: 0.5,
                    ease: "easeOut",
                  },
                  opacity: { duration: 0.2, delay: 0.2 },
                }}
              />

              {/* Specular Rim Highlight */}
              <motion.path
                d="M 330 152 C 280 105, 192 100, 130 158 C 72 214, 70 298, 125 358"
                stroke="#FFFFFF"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.95 }}
                transition={{
                  duration: 0.6,
                  delay: 0.5,
                  ease: "easeOut",
                }}
              />

              {/* Inner Glass Bevel Contour */}
              <motion.path
                d="M 205 172 C 160 178, 138 215, 136 256 C 134 300, 165 338, 215 338 C 260 338, 295 310, 322 310"
                stroke="url(#splashInnerGlowGrad)"
                strokeWidth="5.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.85 }}
                transition={{
                  duration: 0.5,
                  delay: 0.6,
                  ease: "easeOut",
                }}
              />

              {/* 6. AI Sparkle Ignition & Final Pulse */}
              <motion.g
                transform="translate(390, 230)"
                filter="url(#splashSparkleGlow)"
                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                animate={{
                  scale: shouldReduceMotion ? 1 : [0, 1.4, 1, 1, 1.25, 1],
                  opacity: [0, 1, 1, 1, 1, 1],
                  rotate: shouldReduceMotion ? 0 : [-45, 0, 0, 0, 15, 0],
                }}
                transition={{
                  duration: shouldReduceMotion ? 0.4 : 2.4,
                  times: [0, 0.28, 0.48, 0.82, 0.92, 1],
                  ease: "easeInOut",
                  delay: shouldReduceMotion ? 0 : 0.7,
                }}
              >
                <path
                  d="M 0 -48
                     C 1 -14, 14 -1, 48 0
                     C 14 1, 1 14, 0 48
                     C -1 14, -14 1, -48 0
                     C -14 -1, -1 -14, 0 -48 Z"
                  fill="url(#splashSparkleGrad)"
                />
                <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
                <line
                  x1="-26"
                  y1="0"
                  x2="26"
                  y2="0"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  opacity="0.9"
                />
                <line
                  x1="0"
                  y1="-26"
                  x2="0"
                  y2="26"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  opacity="0.9"
                />
              </motion.g>

              {/* Micro-sparkle floating stars */}
              <motion.circle
                cx="110"
                cy="180"
                r="4.5"
                fill="#38BDF8"
                filter="url(#splashSparkleGlow)"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0.8], scale: [0, 1.2, 1] }}
                transition={{ duration: 0.4, delay: 0.8 }}
              />
              <motion.circle
                cx="395"
                cy="360"
                r="4"
                fill="#C084FC"
                filter="url(#splashSparkleGlow)"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0.8], scale: [0, 1.2, 1] }}
                transition={{ duration: 0.4, delay: 0.9 }}
              />
            </svg>
          )}
        </motion.div>

        {/* 2. Wordmark "CleanPix" */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: shouldReduceMotion ? 0.2 : 0.85,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mt-6 flex items-center justify-center gap-1"
        >
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Clean
            <span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(139,92,246,0.6)]">
              Pix
            </span>
          </h1>
        </motion.div>

        {/* 3. Tagline: "Remove backgrounds in seconds" */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: shouldReduceMotion ? 0.3 : 1.05,
            ease: "easeOut",
          }}
          className="mt-2 text-sm sm:text-base font-medium text-text-secondary tracking-wide text-center"
        >
          Remove backgrounds in seconds
        </motion.p>

        {/* 4. Mini Progress / Sparkle Pulse Bar */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.9 }}
          transition={{
            duration: shouldReduceMotion ? 0.5 : 1.6,
            delay: shouldReduceMotion ? 0.1 : 0.2,
            ease: "easeInOut",
          }}
          className="mt-6 h-[2.5px] w-28 sm:w-36 rounded-full bg-gradient-to-r from-[#00F0FF] via-[#818CF8] to-[#C084FC] shadow-[0_0_12px_rgba(0,240,255,0.8)] origin-left"
        />
      </div>

      {/* 5. Skip Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="absolute bottom-8 flex items-center gap-2 px-4 py-1.5 rounded-pill bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-text-muted hover:text-white transition-all cursor-pointer shadow-sm"
      >
        <span>Click anywhere or press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white font-mono">ESC</kbd> to skip</span>
        <ArrowRight size={12} className="text-accent" />
      </motion.div>
    </motion.div>
  );
};
