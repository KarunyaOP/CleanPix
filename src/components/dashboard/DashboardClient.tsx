"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/AuthProvider";
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
} from "lucide-react";
import { SettingsModal } from "@/components/dashboard/SettingsModal";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";

import {
  getCachedProjects,
  fetchProjectsWithDeduplication,
  optimisticallyDeleteProject,
  optimisticallyAddProject,
} from "@/utils/projectCache";

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
  const { data: session } = useSession();
  const userEmail = session?.user?.email || user.email || "";
  const userId = session?.user?.id || user.id || "";
  const userKey = userId || userEmail || "guest";

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

  // Payment success feedback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("payment") === "success") {
        showToast("Payment Successful! Your CleanPix account has been upgraded.");
      }
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      if ((session.user as any).plan) {
        setUserPlan((session.user as any).plan);
      }
      if (typeof (session.user as any).credits === "number") {
        setStats((prev) => ({
          ...prev,
          creditsRemaining: (session.user as any).credits,
        }));
      }
    } else if (user.plan) {
      setUserPlan(user.plan);
    }
  }, [session?.user, user.plan]);

  /**
   * Auto-fetch fresh stats & projects from Supabase with request deduplication
   */
  const fetchFreshData = useCallback(async (force = false) => {
    try {
      const projects = await fetchProjectsWithDeduplication(userEmail, userId, force);
      const completedCount = projects.filter(
        (p) => p.status === "done" || Boolean(p.processedUrl)
      ).length;

      setRecentProjects(projects.slice(0, 5));
      setStats((prev) => ({
        ...prev,
        totalProjects: projects.length,
        totalProcessed: completedCount,
      }));
    } catch (err) {
      console.error("[DASHBOARD_AUTO_SYNC_ERROR]", err);
    }
  }, [userEmail, userId]);

  // Initial mount sync with deduplication
  useEffect(() => {
    fetchFreshData(false);
  }, [fetchFreshData]);

  /**
   * Re-fetch live stats and recent activity directly from database
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchFreshData(true);
      showToast("Dashboard refreshed.");
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
          return [newProj, ...prev].slice(0, 5);
        });
        setStats((prev) => ({
          ...prev,
          totalProjects: prev.totalProjects + 1,
          totalProcessed: prev.totalProcessed + 1,
        }));
        optimisticallyAddProject(userKey, newProj);
      }
      fetchFreshData(false);
    };

    const handleHistoryRefresh = () => {
      fetchFreshData(false);
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
        optimisticallyDeleteProject(userKey, deletedId);
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
    window.addEventListener("cleanpix_history_refresh", handleHistoryRefresh);
    window.addEventListener("cleanpix_project_deleted", handleProjectDeleted);
    window.addEventListener("cleanpix_project_all_deleted", handleAllDeleted);
    window.addEventListener("cleanpix_credits_updated", handleCreditsUpdated);
    window.addEventListener("cleanpix_plan_updated", handlePlanUpdated);

    return () => {
      window.removeEventListener("cleanpix_project_created", handleProjectCreated);
      window.removeEventListener("cleanpix_history_refresh", handleHistoryRefresh);
      window.removeEventListener("cleanpix_project_deleted", handleProjectDeleted);
      window.removeEventListener("cleanpix_project_all_deleted", handleAllDeleted);
      window.removeEventListener("cleanpix_credits_updated", handleCreditsUpdated);
      window.removeEventListener("cleanpix_plan_updated", handlePlanUpdated);
    };
  }, [fetchFreshData, userKey]);

  /**
   * Delete single project from dashboard
   */
  const handleDeleteProject = async (id: string) => {
    setDeleteLoadingId(id);

    try {
      const emailQuery = userEmail ? `userEmail=${encodeURIComponent(userEmail)}` : "";
      const idQuery = userId ? `userId=${encodeURIComponent(userId)}` : "";
      const queryString = [`id=${encodeURIComponent(id)}`, emailQuery, idQuery].filter(Boolean).join("&");

      const res = await fetch(`/api/projects?${queryString}`, {
        method: "DELETE",
        headers: {
          ...(userEmail ? { "x-user-email": userEmail } : {}),
          ...(userId ? { "x-user-id": userId } : {}),
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to delete project from database.");
      }

      // 1. Update local state immediately
      setRecentProjects((prev) => prev.filter((p) => p.id !== id));
      setStats((prev) => ({
        ...prev,
        totalProjects: Math.max(0, prev.totalProjects - 1),
        totalProcessed: Math.max(0, prev.totalProcessed - 1),
      }));

      // 2. Broadcast events to History views
      window.dispatchEvent(
        new CustomEvent("cleanpix_project_deleted", { detail: { id } })
      );
      window.dispatchEvent(new CustomEvent("cleanpix_history_refresh"));

      // 3. Clear from localStorage only if guest
      if (!userEmail && !userId) {
        try {
          const localData = localStorage.getItem("cleanpix_cutout_history");
          if (localData) {
            const parsed = JSON.parse(localData);
            const filtered = parsed.filter((item: any) => item.id !== id);
            localStorage.setItem("cleanpix_cutout_history", JSON.stringify(filtered));
          }
        } catch {}
      }

      // 4. Fetch fresh stats directly from Supabase to guarantee exact synchronization
      await fetchFreshData();

      showToast("Project deleted from database.");
    } catch (err: any) {
      console.error("[DELETE_ERROR]", err);
      showToast(err.message || "Failed to delete project.");
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
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-[12px] bg-[#131A3A] border border-white/20 text-xs font-semibold text-white shadow-lg flex items-center gap-2">
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
        autoTrigger={true}
      />

      {/* Dashboard Top Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0B1E]/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-3.5 sm:px-10 lg:px-16 h-16 sm:h-20 flex items-center justify-between gap-2 min-w-0">
          {/* Left: Back to Editor & Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-6 min-w-0 shrink">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-white transition-colors group shrink-0"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-1 transition-transform shrink-0" />
              <span className="hidden sm:inline">Back to Editor</span>
              <span className="sm:hidden">Back</span>
            </Link>

            <div className="h-5 w-px bg-white/10 hidden sm:block shrink-0" />

            <Link href="/" className="flex items-center gap-2 sm:gap-3 group select-none shrink-0">
              <img
                src="/branding/logo/cleanpix-icon.svg"
                alt="CleanPix Icon"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain group-hover:scale-105 transition-transform shrink-0"
              />
              <span className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight hidden sm:inline">
                Clean<span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">Pix</span>
              </span>
            </Link>
          </div>

          {/* Right Header: Refresh Action & Editor Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-btn font-heading font-semibold text-xs text-white bg-[#131A3A] hover:bg-[#1B2350] border border-white/15 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Refresh database records"
            >
              <RefreshCw
                size={13}
                className={`text-accent shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden xs:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <Link
              href="/"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-btn font-heading font-semibold text-xs text-white bg-gradient-to-r from-primary to-secondary shadow-sm hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <UploadCloud size={14} className="shrink-0" />
              <span>New Cutout</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="max-w-[1440px] mx-auto px-3.5 sm:px-10 lg:px-16 py-6 sm:py-10 flex-1 flex flex-col gap-6 sm:gap-8 w-full min-w-0">
        {/* User Profile / Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-7 rounded-[22px] bg-[#131A3A]/80 border border-white/10 shadow-sm w-full min-w-0">
          {/* Avatar & User Details */}
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 w-full">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User Avatar"}
                referrerPolicy="no-referrer"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-white/15 object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-primary/30 bg-primary/15 flex items-center justify-center text-lg sm:text-xl font-bold text-accent shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}

            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <h1 className="font-heading font-bold text-lg sm:text-2xl text-white tracking-tight break-words">
                Welcome back, {user.name || user.email?.split("@")[0] || "Creator"}!
              </h1>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs sm:text-sm text-text-secondary min-w-0">
                <span className="break-all">{user.email}</span>
                <span className="text-white/20 hidden xs:inline">•</span>
                {isBusinessPlan ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-300">
                    <Building2 size={11} />
                    <span>Business Account</span>
                  </span>
                ) : isProPlan ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[11px] font-semibold text-purple-300">
                    <Sparkles size={11} />
                    <span>Pro Account</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/12 text-[11px] font-medium text-text-secondary">
                    Free Account
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap self-stretch sm:self-auto w-full sm:w-auto shrink-0">
            {isFreePlan && (
              <button
                type="button"
                onClick={() => {
                  setUpgradeModalPlan("pro");
                  setIsUpgradeModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-btn bg-gradient-to-r from-primary to-secondary text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                className="flex-1 sm:flex-none px-4 py-2 rounded-btn bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/35 text-xs font-semibold text-amber-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Building2 size={13} />
                <span>Upgrade to Business</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2 rounded-btn bg-white/[0.06] hover:bg-white/[0.1] border border-white/12 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sliders size={13} className="text-accent" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* 1. Metric Cards Section */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5 w-full min-w-0">
          {/* Card 1: Total Projects */}
          <div className="rounded-[18px] sm:rounded-[20px] bg-[#131A3A]/70 border border-white/10 p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4 shadow-sm hover:border-white/20 transition-all w-full min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary truncate min-w-0">
                Total Projects
              </span>
              <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-accent shrink-0">
                <Layers size={17} />
              </div>
            </div>

            <div className="min-w-0">
              <div className="font-heading font-bold text-3xl sm:text-4xl text-white">
                {stats.totalProjects}
              </div>
              <p className="text-xs text-text-muted mt-1 truncate">
                Saved in your workspace
              </p>
            </div>
          </div>

          {/* Card 2: Total Images Processed */}
          <div className="rounded-[18px] sm:rounded-[20px] bg-[#131A3A]/70 border border-white/10 p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4 shadow-sm hover:border-white/20 transition-all w-full min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary truncate min-w-0">
                Images Processed
              </span>
              <div className="w-9 h-9 rounded-full bg-secondary/15 border border-secondary/30 flex items-center justify-center text-[#C084FC] shrink-0">
                <Sparkles size={17} />
              </div>
            </div>

            <div className="min-w-0">
              <div className="font-heading font-bold text-3xl sm:text-4xl text-white">
                {stats.totalProcessed}
              </div>
              <p className="text-xs text-text-muted mt-1 truncate">
                AI background removals &amp; exports
              </p>
            </div>
          </div>

          {/* Card 3: Credits Remaining */}
          <div className="rounded-[18px] sm:rounded-[20px] bg-[#131A3A]/70 border border-white/10 p-4 sm:p-6 flex flex-col justify-between gap-3 sm:gap-4 shadow-sm hover:border-white/20 transition-all w-full min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary truncate min-w-0">
                Credits Remaining
              </span>
              <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                <Zap size={17} />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 flex-wrap min-w-0">
              <div className="min-w-0">
                <div className="font-heading font-bold text-3xl sm:text-4xl text-white">
                  {["pro", "business", "enterprise"].includes(userPlan.toLowerCase())
                    ? "Unlimited"
                    : stats.creditsRemaining}
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {["pro", "business", "enterprise"].includes(userPlan.toLowerCase())
                    ? "Unlimited AI background processing"
                    : "Upgrade for unlimited processing"}
                </p>
              </div>

              {isFreePlan ? (
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeModalPlan("pro");
                    setIsUpgradeModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-btn bg-primary/25 hover:bg-primary/40 border border-primary/35 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
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
                  className="px-3 py-1.5 rounded-btn bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/35 text-xs font-semibold text-amber-300 transition-colors cursor-pointer shrink-0"
                >
                  Business
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* 2. Quick Actions Section */}
        <section className="space-y-3.5 w-full min-w-0">
          <h2 className="font-heading font-bold text-base sm:text-lg text-white flex items-center gap-2">
            <Sparkles size={15} className="text-accent" />
            <span>Quick Actions</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full min-w-0">
            {/* Quick Action 1: Upload New Image */}
            <Link
              href="/"
              className="group rounded-[18px] bg-[#131A3A]/70 hover:bg-[#182350] border border-white/10 hover:border-primary/40 p-4 sm:p-5 flex items-center justify-between transition-all shadow-sm cursor-pointer w-full min-w-0"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
                  <UploadCloud size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-sm text-white truncate">
                    Upload New Image
                  </h3>
                  <p className="text-[11px] text-text-secondary truncate">
                    Launch AI background remover
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="text-accent group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </Link>

            {/* Quick Action 2: View History */}
            <Link
              href="/history"
              className="group rounded-[18px] bg-[#131A3A]/70 hover:bg-[#182350] border border-white/10 hover:border-accent/40 p-4 sm:p-5 flex items-center justify-between transition-all shadow-sm cursor-pointer w-full min-w-0"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] bg-primary/15 border border-primary/30 flex items-center justify-center text-accent group-hover:scale-105 transition-transform shrink-0">
                  <History size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-sm text-white truncate">
                    View History
                  </h3>
                  <p className="text-[11px] text-text-secondary truncate">
                    Browse past cutouts &amp; exports
                  </p>
                </div>
              </div>
              <ArrowRight size={15} className="text-accent group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </Link>

            {/* Quick Action 3: Settings */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="group rounded-[18px] bg-[#131A3A]/70 hover:bg-[#182350] border border-white/10 hover:border-secondary/40 p-4 sm:p-5 flex items-center justify-between transition-all shadow-sm cursor-pointer text-left w-full min-w-0"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] bg-secondary/15 border border-secondary/30 flex items-center justify-center text-[#C084FC] group-hover:scale-105 transition-transform shrink-0">
                  <Sliders size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-sm text-white truncate">
                    Account &amp; Settings
                  </h3>
                  <p className="text-[11px] text-text-secondary truncate">
                    Preferences &amp; plan benefits
                  </p>
                </div>
              </div>
              <ChevronRight size={15} className="text-accent group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
            </button>
          </div>
        </section>

        {/* 3. Recent Activity Section (Latest 5 Projects) */}
        <section className="space-y-3.5 w-full min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-heading font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <Clock size={15} className="text-accent" />
                <span>Recent Activity</span>
              </h2>
              <p className="text-xs text-text-secondary">
                Your latest 5 processed images and isolation jobs
              </p>
            </div>

            <Link
              href="/history"
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All History</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          {recentProjects.length > 0 ? (
            <div className="rounded-[18px] sm:rounded-[20px] bg-[#131A3A]/70 border border-white/10 overflow-hidden shadow-sm divide-y divide-white/[0.06] w-full min-w-0">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-3 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-white/[0.02] transition-colors w-full min-w-0"
                >
                  {/* Left: Thumbnail & Project Meta */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[10px] checkerboard-pattern border border-white/15 overflow-hidden shrink-0 flex items-center justify-center p-0.5 relative">
                      <img
                        src={project.processedUrl || project.originalUrl}
                        alt="Project Cutout"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-heading font-semibold text-sm text-white truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs">
                          {project.originalUrl?.split("/").pop() || `Project_${project.id.slice(0, 6)}`}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-accent uppercase">
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
                  <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-0">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                        project.status === "done" || project.processedUrl
                          ? "bg-status-success/15 text-status-success border border-status-success/30"
                          : project.status === "processing"
                          ? "bg-primary/15 text-accent border border-primary/30"
                          : "bg-red-500/15 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {project.status === "done" || project.processedUrl ? (
                        <>
                          <CheckCircle2 size={11} />
                          <span>Ready</span>
                        </>
                      ) : project.status === "processing" ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          <span>Processing</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={11} />
                          <span>Failed</span>
                        </>
                      )}
                    </span>

                    {/* Quick Copy, Download & Delete */}
                    {project.processedUrl && (
                      <div className="flex items-center gap-1.5 flex-1 sm:flex-none justify-end">
                        <button
                          type="button"
                          onClick={() => handleCopy(project.id, project.processedUrl!)}
                          className="px-2.5 py-1 rounded-[8px] bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-text-secondary hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer flex-1 sm:flex-none"
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
                          className="px-2.5 py-1 rounded-[8px] bg-primary/15 hover:bg-primary/25 border border-primary/35 text-xs font-semibold text-accent transition-colors flex items-center justify-center gap-1 cursor-pointer flex-1 sm:flex-none"
                          title="Download cutout"
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={deleteLoadingId === project.id}
                          className="p-1 rounded-[8px] text-text-muted hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
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
            <div className="p-10 rounded-[20px] bg-[#131A3A]/50 border border-white/10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-muted mb-3">
                <ImageIcon size={22} />
              </div>
              <h3 className="font-heading font-bold text-sm text-white mb-1">
                No processing history yet
              </h3>
              <p className="text-xs text-text-secondary max-w-xs mb-3">
                Your completed background removals will appear here.
              </p>
              <Link
                href="/"
                className="px-4 py-2 rounded-btn font-heading font-semibold text-xs text-white bg-gradient-to-r from-primary to-secondary shadow-sm cursor-pointer"
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
