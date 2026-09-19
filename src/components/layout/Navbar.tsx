"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "@/components/providers/AuthProvider";
import {
  Menu,
  X,
  User,
  LogOut,
  History,
  LayoutDashboard,
  Sliders,
  ChevronDown,
} from "lucide-react";
import { HistoryModal } from "@/components/layout/HistoryModal";
import { SettingsModal } from "@/components/dashboard/SettingsModal";

export const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("Home");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [currentCredits, setCurrentCredits] = useState<number>(10);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const hasLiveCreditUpdateRef = useRef<boolean>(false);
  const initializedSessionRef = useRef<boolean>(false);

  // Lock body/background scrolling when mobile navigation menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (session?.user) {
      if (!hasLiveCreditUpdateRef.current && !initializedSessionRef.current) {
        if (typeof (session.user as any).credits === "number") {
          setCurrentCredits((session.user as any).credits);
          initializedSessionRef.current = true;
        }
      } else if (hasLiveCreditUpdateRef.current && typeof (session.user as any).credits === "number") {
        setCurrentCredits((session.user as any).credits);
      }
      if ((session.user as any).plan) {
        setCurrentPlan((session.user as any).plan);
      }
    }
  }, [session]);

  const getPlanBadgeConfig = (plan: string = "free") => {
    const p = plan.toLowerCase();
    if (p === "pro") {
      return {
        label: "Pro",
        badgeClass: "bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
      };
    }
    if (p === "business" || p === "enterprise") {
      return {
        label: "Business",
        badgeClass: "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
      };
    }
    return {
      label: "Free",
      badgeClass: "bg-primary/25 border-primary/40 text-accent",
    };
  };

  useEffect(() => {
    const handleCreditsUpdated = (e: any) => {
      if (typeof e.detail?.credits === "number") {
        hasLiveCreditUpdateRef.current = true;
        setCurrentCredits(e.detail.credits);
      }
    };

    const handlePlanUpdated = (e: any) => {
      if (e.detail?.plan) {
        setCurrentPlan(e.detail.plan);
      }
    };

    window.addEventListener("cleanpix_credits_updated", handleCreditsUpdated);
    window.addEventListener("cleanpix_plan_updated", handlePlanUpdated);

    return () => {
      window.removeEventListener("cleanpix_credits_updated", handleCreditsUpdated);
      window.removeEventListener("cleanpix_plan_updated", handlePlanUpdated);
    };
  }, []);

  const navLinks = [
    { label: "Home", href: "#top" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, label: string) => {
    e.preventDefault();
    setActiveLink(label);
    setMobileMenuOpen(false);

    if (href === "#top" || href === "#") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const targetElement = document.querySelector(href);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0A0B1E]/80 backdrop-blur-2xl transition-all duration-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-[68px] flex items-center justify-between">
          {/* Brand Logo */}
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
              setActiveLink("Home");
            }}
            className="flex items-center gap-2.5 sm:gap-3 group select-none cursor-pointer"
          >
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
              <img
                src="/branding/logo/cleanpix-icon.svg"
                alt="CleanPix Brand Icon"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow-[0_0_18px_rgba(0,240,255,0.45)]"
              />
            </div>
            <span className="font-heading font-bold text-xl sm:text-2xl text-[#F8FAFC] tracking-tight group-hover:text-white transition-colors">
              Clean<span className="font-extrabold bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">Pix</span>
            </span>
          </Link>

          {/* Center Nav Links - Desktop (28-32px spacing) */}
          <nav className="hidden md:flex items-center gap-7 lg:gap-8">
            {navLinks.map((link) => {
              const isActive = activeLink === link.label;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, link.label)}
                  className={`relative py-1 text-xs lg:text-sm font-medium tracking-wide transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "text-[#F8FAFC] font-semibold"
                      : "text-text-secondary hover:text-[#F8FAFC]"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_12px_rgba(34,211,238,0.9)]" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right Actions - Desktop */}
          <div className="hidden md:flex items-center gap-2.5">
            {session?.user ? (
              /* Authenticated View: 48px Modern SaaS Profile Pill with 34px Avatar */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 h-[48px] rounded-pill bg-[#131A3A]/90 hover:bg-[#1B2350] border border-primary/35 hover:border-primary/60 shadow-sm transition-all cursor-pointer group shrink-0"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      referrerPolicy="no-referrer"
                      className="w-[34px] h-[34px] rounded-full border border-white/20 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-[34px] h-[34px] rounded-full bg-primary/30 flex items-center justify-center text-accent shrink-0">
                      <User size={16} />
                    </div>
                  )}
                  <span className="text-xs font-semibold text-white truncate max-w-[120px] whitespace-nowrap">
                    {session.user.name || session.user.email?.split("@")[0] || "Account"}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-pill border text-[10px] font-bold shrink-0 ${getPlanBadgeConfig(currentPlan).badgeClass}`}>
                    {getPlanBadgeConfig(currentPlan).label}
                  </span>
                  {["pro", "business", "enterprise"].includes(currentPlan.toLowerCase()) ? (
                    <span className="px-1.5 py-0.5 rounded-pill border text-[10px] font-bold shrink-0 bg-primary/25 border-primary/40 text-accent">
                      Unlimited
                    </span>
                  ) : (
                    <span className={`px-1.5 py-0.5 rounded-pill border text-[10px] font-bold shrink-0 ${
                      currentCredits <= 0
                        ? "bg-red-500/20 border-red-500/40 text-red-300"
                        : "bg-primary/25 border-primary/40 text-accent"
                    }`}>
                      {currentCredits} credits
                    </span>
                  )}
                  <ChevronDown
                    size={12}
                    className={`text-text-muted group-hover:text-white transition-transform duration-200 shrink-0 ${
                      userDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Authenticated Profile Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-[18px] bg-[#131A3A] border border-white/15 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.65),0_0_24px_rgba(79,124,255,0.2)] flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between gap-2">
                      <span className="text-[11px] text-text-muted truncate">
                        {session.user.email}
                      </span>
                      <span className={`px-2 py-0.5 rounded-pill border text-[9px] font-bold shrink-0 ${getPlanBadgeConfig(currentPlan).badgeClass}`}>
                        {getPlanBadgeConfig(currentPlan).label}
                      </span>
                    </div>

                    {/* 1. Dashboard */}
                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[12px] text-xs font-semibold text-text-primary hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <LayoutDashboard size={14} className="text-accent" />
                      <span>Dashboard</span>
                    </Link>

                    {/* 2. History */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setIsHistoryModalOpen(true);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[12px] text-xs font-semibold text-text-primary hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <History size={14} className="text-accent" />
                      <span>History</span>
                    </button>

                    {/* 3. Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setIsSettingsModalOpen(true);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[12px] text-xs font-semibold text-text-primary hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                    >
                      <Sliders size={14} className="text-accent" />
                      <span>Settings</span>
                    </button>

                    <div className="my-1 h-px bg-white/[0.08]" />

                    {/* 4. Sign Out */}
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        try {
                          sessionStorage.removeItem("cleanpix_guest_mode");
                        } catch {}
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[12px] text-xs font-semibold text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Unauthenticated / Guest View - Clean Log In Button */
              <Link
                href="/login"
                className="px-6 py-2.5 rounded-btn text-sm font-semibold text-[#F8FAFC] bg-[#131A3A]/80 border border-white/18 hover:border-accent/40 hover:bg-[#1B2350] hover:shadow-[0_0_18px_rgba(34,211,238,0.2)] transition-all duration-200 cursor-pointer"
              >
                Log In
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-btn bg-[#131A3A] border border-white/15 text-text-secondary hover:text-text-primary hover:border-white/30 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/[0.1] bg-[#0A0B1E]/95 backdrop-blur-2xl px-6 py-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200 max-h-[calc(100dvh-68px)] overflow-y-auto overscroll-contain">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href, link.label)}
                  className={`py-2 px-3.5 rounded-btn text-base font-medium transition-colors cursor-pointer ${
                    activeLink === link.label
                      ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                      : "text-text-secondary hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="pt-4 border-t border-white/[0.1] flex flex-col gap-3">
              {session?.user ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-[#131A3A] border border-white/10">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-semibold text-white truncate">
                        {session.user.name || session.user.email}
                      </span>
                      <span className={`px-2 py-0.5 rounded-pill border text-[9px] font-bold shrink-0 ${getPlanBadgeConfig(currentPlan).badgeClass}`}>
                        {getPlanBadgeConfig(currentPlan).label}
                      </span>
                    </div>
                    {["pro", "business", "enterprise"].includes(currentPlan.toLowerCase()) ? (
                      <span className="px-2 py-0.5 rounded-pill border text-[10px] font-bold shrink-0 bg-primary/20 text-accent border-primary/30">
                        Unlimited
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-pill border text-[10px] font-bold shrink-0 ${
                        currentCredits <= 0
                          ? "bg-red-500/20 border-red-500/40 text-red-300"
                          : "bg-primary/20 text-accent border-primary/30"
                      }`}>
                        {currentCredits} credits
                      </span>
                    )}
                  </div>

                  {/* 1. Dashboard (Mobile) */}
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-3 rounded-btn text-xs font-semibold text-white bg-primary/20 border border-primary/30 flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutDashboard size={14} className="text-accent" />
                    <span>Dashboard</span>
                  </Link>

                  {/* 2. History (Mobile) */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsHistoryModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-btn text-xs font-semibold text-white bg-[#131A3A] border border-white/15 flex items-center gap-2 cursor-pointer"
                  >
                    <History size={14} className="text-accent" />
                    <span>History</span>
                  </button>

                  {/* 3. Settings (Mobile) */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsSettingsModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-btn text-xs font-semibold text-white bg-[#131A3A] border border-white/15 flex items-center gap-2 cursor-pointer"
                  >
                    <Sliders size={14} className="text-accent" />
                    <span>Settings</span>
                  </button>

                  {/* 4. Sign Out (Mobile) */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      try {
                        sessionStorage.removeItem("cleanpix_guest_mode");
                      } catch {}
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="w-full py-2.5 px-3 rounded-btn text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/25 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-3 rounded-btn text-sm font-semibold text-center text-white bg-[#131A3A] border border-white/20 hover:bg-[#1B2350] hover:border-primary/40 cursor-pointer"
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Authenticated User History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* Authenticated User Settings Modal */}
      {session?.user && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            credits: currentCredits,
            plan: currentPlan,
            authProvider: (session.user as any).authProvider,
          }}
        />
      )}
    </>
  );
};
