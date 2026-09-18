"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Sparkles,
  Zap,
  UploadCloud,
  History,
  Sliders,
  RefreshCw,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  ImageIcon,
  Building2,
  ShieldCheck,
  FolderArchive,
} from "lucide-react";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";

export interface DashboardProject {
  id: string;
  originalUrl: string;
  processedUrl: string | null;
  detectedObject: string | null;
  status: string;
  createdAt: string;
  exports?: Array<{
    id: string;
    format: string;
    url: string;
  }>;
}

export interface DashboardClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    credits: number;
    plan?: string;
    authProvider?: string;
    createdAt?: string;
  };
  initialStats: {
    totalProjects: number;
    totalProcessed: number;
    creditsRemaining: number;
  };
  initialRecentProjects: DashboardProject[];
}

export const DashboardClient: React.FC<DashboardClientProps> = ({
  user,
  initialStats,
  initialRecentProjects,
}) => {
  const router = useRouter();
  const [stats, setStats] = useState(initialStats);
  const [recentProjects, setRecentProjects] = useState<DashboardProject[]>(initialRecentProjects);
  const [userPlan, setUserPlan] = useState<string>(user.plan || "free");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalPlan, setUpgradeModalPlan] = useState<"pro" | "business">("pro");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Payment success banner/toast trigger
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success") {
        showToast("🎉 Payment Successful! Your CleanPix account has been upgraded.");
      }
    }
  }, []);

  // Synchronize stats and recentProjects when Server Component props update from database refresh
  useEffect(() => {
    setStats(initialStats);
  }, [initialStats.totalProjects, initialStats.totalProcessed, initialStats.creditsRemaining]);

  useEffect(() => {
    setRecentProjects(initialRecentProjects);
  }, [initialRecentProjects]);

  useEffect(() => {
    if (user.plan) {
      setUserPlan(user.plan);
    }
  }, [user.plan]);

  /**
   * Re-fetch live stats and recent activity directly from database
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/projects", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          const freshProjects: DashboardProject[] = data.projects;
          const completedCount = freshProjects.filter(
            (p) => p.status === "done" || p.processedUrl
          ).length;

          setRecentProjects(freshProjects.slice(0, 5));
          setStats((prev) => ({
            ...prev,
            totalProjects: freshProjects.length,
            totalProcessed: completedCount,
          }));
          showToast("Dashboard refreshed from database.");
        }
      }
      router.refresh();
    } catch (err) {
      console.error("[DASHBOARD_REFRESH_ERROR]", err);
      showToast("Could not refresh dashboard.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time synchronization event listeners across tabs/components
  useEffect(() => {
    const handleProjectCreated = (e: any) => {
      const newProj = e.detail;
      if (newProj && newProj.id) {
        setRecentProjects((prev) => {
          if (prev.some((p) => p.id === newProj.id)) return prev;
          return [newProj, ...prev.slice(0, 4)];
        });
        setStats((prev) => ({
          ...prev,
          totalProjects: prev.totalProjects + 1,
          totalProcessed: prev.totalProcessed + 1,
        }));
      }
    };

    const handleProjectDeleted = (e: any) => {
      const deletedId = e.detail?.id;
      if (deletedId) {
        setRecentProjects((prev) => prev.filter((p) => p.id !== deletedId));
        setStats((prev) => ({
          ...prev,
          totalProjects: Math.max(0, prev.totalProjects - 1),
          totalProcessed: Math.max(0, prev.totalProcessed - 1),
        }));
      }
    };

    const handleAllDeleted = () => {
      setRecentProjects([]);
      setStats((prev) => ({
        ...prev,
        totalProjects: 0,
        totalProcessed: 0,
      }));
    };

    const handleCreditsUpdated = (e: any) => {
      if (typeof e.detail?.credits === "number") {
        setStats((prev) => ({
          ...prev,
          creditsRemaining: e.detail.credits,
        }));
      }
    };

    const handlePlanUpdated = (e: any) => {
      if (e.detail?.plan) {
        setUserPlan(e.detail.plan);
      }
    };

    window.addEventListener("cleanpix_project_created", handleProjectCreated);
    window.addEventListener("cleanpix_project_deleted", handleProjectDeleted);
    window.addEventListener("cleanpix_project_all_deleted", handleAllDeleted);
    window.addEventListener("cleanpix_credits_updated", handleCreditsUpdated);
    window.addEventListener("cleanpix_plan_updated", handlePlanUpdated);

    return () => {
      window.removeEventListener("cleanpix_project_created", handleProjectCreated);
      window.removeEventListener("cleanpix_project_deleted", handleProjectDeleted);
      window.removeEventListener("cleanpix_project_all_deleted", handleAllDeleted);
      window.removeEventListener("cleanpix_credits_updated", handleCreditsUpdated);
      window.removeEventListener("cleanpix_plan_updated", handlePlanUpdated);
    };
  }, []);

  /**
   * Delete single project from dashboard
   */
  const handleDeleteProject = async (id: string) => {
    setDeleteLoadingId(id);

    // 1. Broadcast event
    window.dispatchEvent(
      new CustomEvent("cleanpix_project_deleted", { detail: { id } })
    );

    // 2. Clear from localStorage
    try {
      const localData = localStorage.getItem("cleanpix_cutout_history");
      if (localData) {
        const parsed = JSON.parse(localData);
        const filtered = parsed.filter((item: any) => item.id !== id);
        localStorage.setItem("cleanpix_cutout_history", JSON.stringify(filtered));
      }
    } catch {}

    // 3. Send API request
    try {
      await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      showToast("Project deleted.");
      router.refresh();
    } catch (err) {
      console.error("[DELETE_ERROR]", err);
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleCopy = async (id: string, url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopiedId(id);
      showToast("Cutout copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      showToast("Link copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = (url: string, id: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `cleanpix_cutout_${id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Download started.");
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  const isBusinessPlan = ["business", "enterprise"].includes(userPlan.toLowerCase());
  const isProPlan = userPlan.toLowerCase() === "pro";
  const isFreePlan = !isBusinessPlan && !isProPlan;

  return (
    <div className="min-h-screen bg-[#0A0B1E] text-[#F8FAFC] flex flex-col selection:bg-primary/40 selection:text-white">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-[14px] bg-[#131A3A]/95 border border-primary/50 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(34,211,238,0.3)] animate-in fade-in slide-from-bottom-2 duration-200 flex items-center gap-2">
          <Sparkles size={13} className="text-accent" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={{
          name: user.name,
          email: user.email,
          image: user.image,
          credits: stats.creditsRemaining,
          plan: userPlan,
          authProvider: user.authProvider,
        }}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        initialPlan={upgradeModalPlan}
      />

      {/* Dashboard Top Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0B1E]/85 backdrop-blur-2xl">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          {/* Left: Clear Back to Editor & Brand Logo */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-white transition-colors group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Editor</span>
            </Link>

            <div className="h-5 w-px bg-white/10 hidden sm:block" />

            <Link href="/" className="flex items-center gap-3 group select-none">
              <img
                src="/branding/logo/cleanpix-icon.svg"
                alt="CleanPix Icon"
                className="w-8 h-8 object-contain drop-shadow-[0_0_16px_rgba(0,240,255,0.45)] group-hover:scale-105 transition-transform"
              />
              <span className="font-heading font-bold text-xl text-white tracking-tight hidden sm:inline">
                Clean<span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">Pix</span>
              </span>
            </Link>
          </div>

          {/* Right Header: Refresh Action & Editor Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-btn font-heading font-semibold text-xs text-white bg-[#131A3A]/90 hover:bg-[#1B2350] border border-white/18 hover:border-primary/40 shadow-sm hover:shadow-[0_0_16px_rgba(79,124,255,0.3)] transition-all cursor-pointer disabled:opacity-50"
              title="Refresh database records"
            >
              <RefreshCw
                size={13}
                className={`text-accent ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <Link
              href="/"
              className="px-4 py-2 rounded-btn font-heading font-semibold text-xs text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(79,124,255,0.4)] hover:shadow-[0_0_30px_rgba(79,124,255,0.7)] hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud size={14} />
              <span>New Cutout</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 py-10 flex-1 flex flex-col gap-10">
        {/* User Welcome Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-[28px] bg-gradient-to-r from-[#131A3A] via-[#151D42] to-[#0E142C] border border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(79,124,255,0.15)] relative overflow-hidden">
          {/* Ambient Glow */}
          <div
            className={`absolute right-0 top-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none ${
              isBusinessPlan ? "bg-amber-500/15" : "bg-primary/15"
            }`}
          />

          <div className="flex items-center gap-4 sm:gap-5 z-10">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User Avatar"}
                referrerPolicy="no-referrer"
                className={`w-16 h-16 rounded-full border-2 object-cover shadow-lg ${
                  isBusinessPlan
                    ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                    : isProPlan
                    ? "border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                    : "border-primary/50 shadow-[0_0_20px_rgba(79,124,255,0.4)]"
                }`}
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl font-bold shadow-lg ${
                  isBusinessPlan
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                    : isProPlan
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    : "bg-primary/20 border-primary/40 text-accent shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                }`}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
                  Welcome back, {user.name || user.email?.split("@")[0] || "Creator"}!
                </h1>

                {isBusinessPlan ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-pill bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                    <Building2 size={11} />
                    <span>BUSINESS ACCOUNT</span>
                  </span>
                ) : isProPlan ? (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-pill bg-purple-500/20 border border-purple-500/40 text-[10px] font-bold text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                    <Sparkles size={11} />
                    <span>PRO CREATOR ACCOUNT</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-pill bg-primary/25 border border-primary/40 text-[10px] font-bold text-accent">
                    FREE ACCOUNT
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-text-secondary mt-1">
                {user.email} <span className="text-white/20 mx-1.5">•</span>{" "}
                {isBusinessPlan
                  ? "Business Account"
                  : isProPlan
                  ? "Pro Creator Account"
                  : "Free Account"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 z-10 self-start sm:self-auto">
            {isFreePlan && (
              <button
                type="button"
                onClick={() => {
                  setUpgradeModalPlan("pro");
                  setIsUpgradeModalOpen(true);
                }}
                className="px-4 py-2 rounded-pill bg-gradient-to-r from-primary to-secondary text-xs font-bold text-white shadow-[0_0_16px_rgba(79,124,255,0.5)] hover:shadow-[0_0_24px_rgba(79,124,255,0.7)] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Zap size={13} />
                <span>Upgrade Plan</span>
              </button>
            )}

            {isProPlan && (
              <button
                type="button"
                onClick={() => {
                  setUpgradeModalPlan("business");
                  setIsUpgradeModalOpen(true);
                }}
                className="px-4 py-2 rounded-pill bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-bold text-white shadow-[0_0_16px_rgba(245,158,11,0.5)] hover:shadow-[0_0_24px_rgba(245,158,11,0.7)] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 size={13} />
                <span>Upgrade to Business</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 rounded-pill bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-semibold text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sliders size={13} className="text-accent" />
              <span>Account Settings</span>
            </button>
          </div>
        </div>

        {/* BUSINESS PLAN FEATURE HIGHLIGHTS CARD */}
        {isBusinessPlan && (
          <div className="p-6 rounded-[24px] bg-gradient-to-r from-[#221B13]/90 via-[#1A152E]/90 to-[#131A3A]/90 border border-amber-500/40 shadow-[0_12px_36px_rgba(0,0,0,0.5),0_0_24px_rgba(245,158,11,0.2)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-white flex items-center gap-2">
                    <span>CleanPix Business Workspace</span>
                    <span className="px-2 py-0.2 rounded-pill bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] uppercase font-bold">
                      Commercial License
                    </span>
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Your account is equipped with full commercial usage rights and priority processing.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-pill bg-status-success/20 border border-status-success/40 text-xs font-bold text-status-success flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 size={13} />
                <span>Unlimited Removals Active</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-[16px] bg-[#0A0B1E]/60 border border-white/10 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                  <Zap size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white">Priority Queue</span>
                  <span className="text-[10px] text-text-secondary">High-speed server priority</span>
                </div>
              </div>

              <div className="p-3 rounded-[16px] bg-[#0A0B1E]/60 border border-white/10 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                  <FolderArchive size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white">Bulk Upload</span>
                  <span className="text-[10px] text-text-secondary">UI-ready batch processing</span>
                </div>
              </div>

              <div className="p-3 rounded-[16px] bg-[#0A0B1E]/60 border border-white/10 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
                  <ShieldCheck size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-white">Commercial Rights</span>
                  <span className="text-[10px] text-text-secondary">Client & marketing licenses</span>
                </div>
              </div>

              <div className="p-3 rounded-[16px] bg-[#0A0B1E]/60 border border-white/10 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                  <Sparkles size={14} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white">Developer API</span>
                    <span className="px-1.5 py-0.2 rounded-pill bg-white/15 text-[8px] font-bold text-white">
                      Soon
                    </span>
                  </div>
                  <span className="text-[10px] text-text-secondary">REST API & Webhooks</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1. 3 METRIC CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Total Projects */}
          <div className="relative rounded-[24px] bg-[#131A3A]/85 hover:bg-[#131A3A] border border-white/12 p-6 flex flex-col justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(79,124,255,0.2)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Total Projects
              </span>
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-accent shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                <Layers size={18} />
              </div>
            </div>

            <div>
              <div className="font-heading font-black text-4xl sm:text-5xl text-white">
                {stats.totalProjects}
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                Saved in your database workspace
              </p>
            </div>
          </div>

          {/* Card 2: Total Images Processed */}
          <div className="relative rounded-[24px] bg-[#131A3A]/85 hover:bg-[#131A3A] border border-white/12 p-6 flex flex-col justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(139,92,246,0.25)] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Images Processed
              </span>
              <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary/40 flex items-center justify-center text-[#C084FC] shadow-[0_0_12px_rgba(139,92,246,0.4)]">
                <Sparkles size={18} />
              </div>
            </div>

            <div>
              <div className="font-heading font-black text-4xl sm:text-5xl text-white">
                {stats.totalProcessed}
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                Lossless AI background removals & exports
              </p>
            </div>
          </div>

          {/* Card 3: Credits Remaining */}
          <div
            className={`relative rounded-[24px] border p-6 flex flex-col justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.4)] transition-all ${
              isBusinessPlan
                ? "bg-gradient-to-br from-[#241B15] to-[#131A3A] border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                : isProPlan
                ? "bg-gradient-to-br from-[#1E1638] to-[#131A3A] border-purple-500/40 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
                : "bg-gradient-to-br from-[#182250] to-[#131A3A] border-primary/40 shadow-[0_0_30px_rgba(79,124,255,0.2)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  isBusinessPlan
                    ? "text-amber-300"
                    : isProPlan
                    ? "text-purple-300"
                    : "text-accent"
                }`}
              >
                Credits Remaining
              </span>
              <div
                className={`w-10 h-10 rounded-full border flex items-center justify-center shadow-[0_0_12px_rgba(34,197,94,0.3)] ${
                  isBusinessPlan
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-status-success/20 border-status-success/40 text-status-success"
                }`}
              >
                <Zap size={18} />
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-heading font-black text-3xl sm:text-4xl text-white">
                  {["pro", "business", "enterprise"].includes(userPlan.toLowerCase())
                    ? "Unlimited"
                    : stats.creditsRemaining}
                </div>
                <p className="text-xs text-accent/80 font-medium mt-1.5">
                  {["pro", "business", "enterprise"].includes(userPlan.toLowerCase())
                    ? "Unlimited high-speed AI processing"
                    : "Upgrade to Pro or Business for unlimited"}
                </p>
              </div>

              {isFreePlan ? (
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeModalPlan("pro");
                    setIsUpgradeModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-pill bg-primary/30 hover:bg-primary/50 border border-primary/40 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Upgrade
                </button>
              ) : isProPlan ? (
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeModalPlan("business");
                    setIsUpgradeModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-pill bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-xs font-bold text-amber-300 transition-colors cursor-pointer"
                >
                  Business
                </button>
              ) : (
                <span className="px-3 py-1 rounded-pill bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300">
                  LIFETIME
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 2. QUICK ACTIONS SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-white flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <span>Quick Actions</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Quick Action 1: Upload New Image */}
            <Link
              href="/"
              className="group relative rounded-[22px] bg-[#131A3A]/80 hover:bg-[#182350] border border-white/12 hover:border-primary p-5 flex items-center justify-between transition-all duration-200 shadow-md hover:shadow-[0_0_30px_rgba(79,124,255,0.3)] cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[14px] bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-[0_0_20px_rgba(79,124,255,0.6)] group-hover:scale-105 transition-transform">
                  <UploadCloud size={22} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-white">
                    Upload New Image
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Launch AI background remover
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-accent group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Quick Action 2: View History */}
            <Link
              href="/history"
              className="group relative rounded-[22px] bg-[#131A3A]/80 hover:bg-[#182350] border border-white/12 hover:border-accent/50 p-5 flex items-center justify-between transition-all duration-200 shadow-md hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[14px] bg-primary/20 border border-primary/40 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                  <History size={22} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-white">
                    View Processing History
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Browse all past cutouts &amp; exports
                  </p>
                </div>
              </div>
              <ArrowRight size={16} className="text-accent group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Quick Action 3: Settings */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="group relative rounded-[22px] bg-[#131A3A]/80 hover:bg-[#182350] border border-white/12 hover:border-secondary/50 p-5 flex items-center justify-between transition-all duration-200 shadow-md hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[14px] bg-secondary/20 border border-secondary/40 flex items-center justify-center text-[#C084FC] group-hover:scale-105 transition-transform">
                  <Sliders size={22} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-white">
                    Settings &amp; Account
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Preferences, plan benefits &amp; exports
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-accent group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>

        {/* 3. RECENT ACTIVITY SECTION (LATEST 5 PROJECTS) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-lg sm:text-xl text-white flex items-center gap-2">
                <Clock size={16} className="text-accent" />
                <span>Recent Activity</span>
              </h2>
              <p className="text-xs text-text-secondary">
                Your latest 5 processed images and isolation jobs
              </p>
            </div>

            <Link
              href="/history"
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All History</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          {recentProjects.length > 0 ? (
            <div className="rounded-[24px] bg-[#131A3A]/80 border border-white/12 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)] divide-y divide-white/[0.06]">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Left: Thumbnail & Project Meta */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-[12px] checkerboard-pattern border border-white/15 overflow-hidden shrink-0 flex items-center justify-center p-1 relative shadow-inner">
                      <img
                        src={project.processedUrl || project.originalUrl}
                        alt="Project Cutout"
                        className="w-full h-full object-contain filter drop-shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-bold text-sm text-white truncate max-w-[220px] sm:max-w-xs">
                          {project.originalUrl?.split("/").pop() || `Project_${project.id.slice(0, 6)}`}
                        </h4>
                        <span className="px-2 py-0.5 rounded-pill bg-white/[0.06] border border-white/10 text-[10px] font-bold text-accent uppercase">
                          {project.detectedObject || "Cutout"}
                        </span>
                      </div>
                      <span className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1.5">
                        <Clock size={11} />
                        {formatRelativeTime(project.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status Pill & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-bold ${
                        project.status === "done" || project.processedUrl
                          ? "bg-status-success/20 text-status-success border border-status-success/30"
                          : project.status === "processing"
                          ? "bg-primary/20 text-accent border border-primary/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {project.status === "done" || project.processedUrl ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Ready</span>
                        </>
                      ) : project.status === "processing" ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Processing</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} />
                          <span>Failed</span>
                        </>
                      )}
                    </span>

                    {/* Quick Copy, Download & Delete */}
                    {project.processedUrl && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(project.id, project.processedUrl!)}
                          className="px-3 py-1.5 rounded-[10px] bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-text-secondary hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                          title="Copy PNG to clipboard"
                        >
                          {copiedId === project.id ? (
                            <>
                              <Check size={12} className="text-status-success" />
                              <span className="text-status-success">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownload(project.processedUrl!, project.id)}
                          className="px-3 py-1.5 rounded-[10px] bg-primary/20 hover:bg-primary/35 border border-primary/40 text-xs font-bold text-accent transition-colors flex items-center gap-1 cursor-pointer"
                          title="Download cutout"
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={deleteLoadingId === project.id}
                          className="p-1.5 rounded-[10px] text-text-muted hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete from history"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-[24px] bg-[#131A3A]/60 border border-white/10 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-muted mb-3">
                <ImageIcon size={26} />
              </div>
              <h3 className="font-heading font-bold text-base text-white mb-1">
                No processing history yet
              </h3>
              <p className="text-xs text-text-secondary max-w-xs mb-4">
                Your completed background removals will appear here.
              </p>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-btn font-heading font-bold text-xs text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(79,124,255,0.5)] cursor-pointer"
              >
                Upload Image
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
