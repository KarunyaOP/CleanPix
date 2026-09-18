"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  X,
  User,
  Mail,
  Shield,
  Zap,
  Sliders,
  LogOut,
  Sparkles,
  Check,
  Building2,
  ArrowRight,
  ShieldCheck,
  FolderArchive,
  Crown,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    credits?: number;
    plan?: string;
    authProvider?: string;
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [activeTab, setActiveTab] = useState<"account" | "preferences">("account");
  const [autoSharpen, setAutoSharpen] = useState<boolean>(true);
  const [autoSaveHistory, setAutoSaveHistory] = useState<boolean>(true);
  const [defaultFormat, setDefaultFormat] = useState<string>("png");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [credits, setCredits] = useState<number>(user.credits ?? 10);
  const [userPlan, setUserPlan] = useState<string>(user.plan || "free");
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);
  const [upgradePlanTarget, setUpgradePlanTarget] = useState<"pro" | "business">("pro");
  const hasLiveCreditUpdateRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof user.credits === "number") {
      setCredits(user.credits);
    }
  }, [user.credits]);

  useEffect(() => {
    if (user.plan) {
      setUserPlan(user.plan);
    }
  }, [user.plan]);

  useEffect(() => {
    const handleCreditsUpdated = (e: any) => {
      if (typeof e.detail?.credits === "number") {
        hasLiveCreditUpdateRef.current = true;
        setCredits(e.detail.credits);
      }
    };

    const handlePlanUpdated = (e: any) => {
      if (e.detail?.plan) {
        setUserPlan(e.detail.plan);
      }
    };

    window.addEventListener("cleanpix_credits_updated", handleCreditsUpdated);
    window.addEventListener("cleanpix_plan_updated", handlePlanUpdated);

    return () => {
      window.removeEventListener("cleanpix_credits_updated", handleCreditsUpdated);
      window.removeEventListener("cleanpix_plan_updated", handlePlanUpdated);
    };
  }, []);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isUpgradeOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isUpgradeOpen]);

  const handleSavePreferences = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleOpenUpgrade = (plan: "pro" | "business") => {
    setUpgradePlanTarget(plan);
    setIsUpgradeOpen(true);
  };

  if (!isOpen) return null;

  const isBusiness = ["business", "enterprise"].includes(userPlan.toLowerCase());
  const isPro = userPlan.toLowerCase() === "pro";
  const isFree = !isBusiness && !isPro;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#05060F]/85 backdrop-blur-xl animate-in fade-in duration-200"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="CleanPix Account & Processing Settings"
      >
        <div
          className="relative w-full max-w-[620px] rounded-[28px] bg-[#131A3A]/95 border border-primary/40 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(79,124,255,0.25)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0A0B1E]/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-accent shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                <Sliders size={14} className="text-accent" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  Account &amp; Preferences
                </h3>
                <p className="text-xs text-text-secondary">
                  Manage your plan, benefits, and AI processing settings
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 pt-3 border-b border-white/[0.08] bg-[#0E142A]/60 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "account"
                  ? "text-white"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              <span>Account &amp; Plan</span>
              {activeTab === "account" && (
                <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preferences")}
              className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "preferences"
                  ? "text-white"
                  : "text-text-secondary hover:text-white"
              }`}
            >
              <span>AI &amp; Export Preferences</span>
              {activeTab === "preferences" && (
                <span className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              )}
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
            {activeTab === "account" ? (
              /* Tab 1: Account Information & Plan Details */
              <div className="space-y-4">
                {/* Profile Card */}
                <div className="p-4 rounded-[18px] bg-[#0A0B1E]/90 border border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || "User Avatar"}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full border border-white/20 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-accent">
                        <User size={22} />
                      </div>
                    )}

                    <div className="flex flex-col">
                      <h4 className="font-heading font-bold text-sm text-white">
                        {user.name || "CleanPix Member"}
                      </h4>
                      <span className="text-xs text-text-secondary">{user.email}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                      Credits
                    </span>
                    {isBusiness || isPro ? (
                      <span className="font-heading font-extrabold text-sm text-accent">
                        Unlimited
                      </span>
                    ) : (
                      <span
                        className={`font-heading font-extrabold text-sm ${
                          credits <= 0 ? "text-red-400" : "text-accent"
                        }`}
                      >
                        {credits} Credits
                      </span>
                    )}
                  </div>
                </div>

                {/* Current Plan Card & Included Benefits */}
                <div
                  className={`p-4 rounded-[18px] border transition-all ${
                    isBusiness
                      ? "bg-gradient-to-br from-[#221B13]/90 to-[#0A0B1E]/90 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                      : isPro
                      ? "bg-gradient-to-br from-[#1E1638]/90 to-[#0A0B1E]/90 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                      : "bg-[#0A0B1E]/80 border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      {isBusiness ? (
                        <Building2 size={16} className="text-amber-400" />
                      ) : isPro ? (
                        <Sparkles size={16} className="text-purple-400" />
                      ) : (
                        <Zap size={16} className="text-accent" />
                      )}
                      <span className="font-heading font-bold text-sm text-white">
                        {isBusiness
                          ? "Business Commercial Plan"
                          : isPro
                          ? "Pro Creator Plan"
                          : "Free Starter Plan"}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-pill text-[10px] font-bold border ${
                        isBusiness
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : isPro
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                          : "bg-primary/20 border-primary/40 text-accent"
                      }`}
                    >
                      {isBusiness
                        ? "₹399 ONE-TIME"
                        : isPro
                        ? "₹99 ONE-TIME"
                        : "FREE FOREVER"}
                    </span>
                  </div>

                  {/* Dynamic Included Benefits List */}
                  <div className="space-y-2 mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                      Included In Your Plan:
                    </span>

                    {isBusiness ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-primary">
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-amber-400 shrink-0" />
                          <span>Unlimited AI background removals</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-amber-400 shrink-0" />
                          <span>Priority AI processing pipeline</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-amber-400 shrink-0" />
                          <span>Full commercial usage rights</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-amber-400 shrink-0" />
                          <span>Bulk upload support (UI-Ready)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-amber-400 shrink-0" />
                          <span>25MB high-res file upload limit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-amber-400 shrink-0" />
                          <span>Official Business badge</span>
                        </div>
                      </div>
                    ) : isPro ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-primary">
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-status-success shrink-0" />
                          <span>Unlimited AI background removals</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-status-success shrink-0" />
                          <span>2x HD AI sharpening &amp; enhancement</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-status-success shrink-0" />
                          <span>1-Click Social Media Kit generator</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-status-success shrink-0" />
                          <span>Smart background recommendations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-status-success shrink-0" />
                          <span>Full processing history access</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-status-success shrink-0" />
                          <span>Single-image lossless exports</span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-primary">
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-accent shrink-0" />
                          <span>10 Free AI cutout credits</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-accent shrink-0" />
                          <span>Standard processing speed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-accent shrink-0" />
                          <span>Lossless PNG transparency</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={12} className="text-accent shrink-0" />
                          <span>Direct clipboard paste &amp; copy</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Plan Upgrade Actions */}
                  {isFree && (
                    <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenUpgrade("pro")}
                        className="flex-1 py-2 px-3 rounded-[12px] bg-gradient-to-r from-primary to-secondary text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Zap size={12} />
                        <span>Upgrade to Pro (₹99)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenUpgrade("business")}
                        className="flex-1 py-2 px-3 rounded-[12px] bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Building2 size={12} />
                        <span>Upgrade to Business (₹399)</span>
                      </button>
                    </div>
                  )}

                  {isPro && (
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                      <span className="text-[11px] text-text-secondary">
                        Need commercial usage rights &amp; priority queue?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenUpgrade("business")}
                        className="py-1.5 px-3 rounded-[12px] bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-xs font-bold text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Building2 size={12} />
                        <span>Get Business (₹399)</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Account Details List */}
                <div className="p-4 rounded-[18px] bg-[#0A0B1E]/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.06]">
                    <span className="text-text-secondary flex items-center gap-2">
                      <Mail size={13} className="text-accent" />
                      <span>Email Address</span>
                    </span>
                    <span className="font-mono text-white font-medium">{user.email}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-text-secondary flex items-center gap-2">
                      <Shield size={13} className="text-accent" />
                      <span>Authentication Method</span>
                    </span>
                    <span className="capitalize font-semibold text-white">
                      {user.authProvider || "Email Magic Link"}
                    </span>
                  </div>
                </div>

                {/* Sign Out Action */}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full py-2.5 px-4 rounded-[14px] text-xs font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Sign Out of CleanPix</span>
                </button>
              </div>
            ) : (
              /* Tab 2: AI Preferences */
              <div className="space-y-4">
                <div className="p-4 rounded-[18px] bg-[#0A0B1E]/80 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Auto 2x HD Sharpening</h4>
                      <p className="text-[11px] text-text-secondary">
                        Automatically calculate edge enhancements during standard removal
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSharpen(!autoSharpen)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        autoSharpen ? "bg-primary" : "bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          autoSharpen ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-px bg-white/[0.06]" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Auto-Save to Cloud History</h4>
                      <p className="text-[11px] text-text-secondary">
                        Keep completed cutouts synced to your database dashboard
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSaveHistory(!autoSaveHistory)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                        autoSaveHistory ? "bg-primary" : "bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          autoSaveHistory ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-px bg-white/[0.06]" />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Default Export Format</h4>
                      <p className="text-[11px] text-text-secondary">
                        Preferred download format when clicking one-click export
                      </p>
                    </div>
                    <select
                      value={defaultFormat}
                      onChange={(e) => setDefaultFormat(e.target.value)}
                      className="px-3 py-1.5 rounded-[10px] bg-[#131A3A] border border-white/20 text-xs font-semibold text-white focus:outline-none focus:border-accent"
                    >
                      <option value="png">Lossless PNG</option>
                      <option value="webp">Optimized WebP</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="w-full py-2.5 rounded-btn font-heading font-bold text-xs text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(79,124,255,0.5)] hover:shadow-[0_0_30px_rgba(79,124,255,0.75)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {savedSuccess ? (
                    <>
                      <Check size={13} className="text-status-success" />
                      <span>Preferences Saved</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-accent" />
                      <span>Save Preferences</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-white/10 bg-[#0A0B1E]/60 flex items-center justify-between text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-status-success" />
              <span>CleanPix Account Security</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-pill bg-white/[0.05] hover:bg-white/10 border border-white/10 font-semibold text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        initialPlan={upgradePlanTarget}
      />
    </>
  );
};
