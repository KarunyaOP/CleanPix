"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Heart } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#05060F] py-12 sm:py-16 text-xs text-text-secondary select-none">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-white/[0.08]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-9 h-9 rounded-[12px] bg-gradient-to-tr from-primary to-secondary shadow-[0_0_16px_rgba(79,124,255,0.4)]">
              <span className="font-heading font-extrabold text-lg text-white">C</span>
            </div>
            <span className="font-heading font-bold text-xl text-white tracking-tight">CleanPix</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 sm:gap-8 flex-wrap justify-center text-sm font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-text-muted">
          <p>© {new Date().getFullYear()} CleanPix. All rights reserved. 100% Automated AI Background Removal.</p>
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart size={12} className="text-pink-500 fill-current mx-0.5" />
            <span>for creator workflows</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
