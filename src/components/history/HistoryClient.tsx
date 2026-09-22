"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/AuthProvider";
import {
  History,
  RefreshCw,
  Clock,
  Download,
  Copy,
  Trash2,
  Check,
  ArrowLeft,
  Sparkles,
  UploadCloud,
  ImageIcon,
  AlertTriangle,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
} from "lucide-react";
import { DetectedCategory } from "@/types/schema";

export interface ProjectRecord {
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

export interface HistoryClientProps {
  initialProjects: ProjectRecord[];
  initialUser?: {
    name?: string | null;
    email?: string | null;
    plan?: string | null;
    credits?: number | null;
  } | null;
}

export const HistoryClient: React.FC<HistoryClientProps> = ({
  initialProjects,
  initialUser,
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [livePlan, setLivePlan] = useState<string>(
    (session?.user as any)?.plan || initialUser?.plan || "free"
  );
  const [liveCredits, setLiveCredits] = useState<number>(
    (session?.user as any)?.credits ?? initialUser?.credits ?? 10
  );
  const userEmail = session?.user?.email || initialUser?.email || "";
  const userId = session?.user?.id || (initialUser as any)?.id || "";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (session?.user) {
      if ((session.user as any).plan) {
        setLivePlan((session.user as any).plan);
      }
      if (typeof (session.user as any).credits === "number") {
        setLiveCredits((session.user as any).credits);
      }
    } else if (initialUser) {
      if (initialUser.plan) setLivePlan(initialUser.plan);
      if (typeof initialUser.credits === "number") setLiveCredits(initialUser.credits);
    }
  }, [session?.user, initialUser]);

  /**
   * Auto-fetch fresh history records from Supabase in background
   */
  const fetchFreshHistory = useCallback(async () => {
    try {
      const emailQuery = userEmail ? `userEmail=${encodeURIComponent(userEmail)}` : "";
      const idQuery = userId ? `userId=${encodeURIComponent(userId)}` : "";
      const queryString = [emailQuery, idQuery].filter(Boolean).join("&");
      const url = `/api/projects${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          ...(userEmail ? { "x-user-email": userEmail } : {}),
          ...(userId ? { "x-user-id": userId } : {}),
        },
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          if (data?.success && Array.isArray(data.projects)) {
            setProjects(data.projects);
          }
        }
      }
    } catch (err) {
      console.error("[HISTORY_AUTO_SYNC_ERROR]", err);
    }
  }, [userEmail, userId]);

  // Initial mount live sync from Supabase
  useEffect(() => {
    fetchFreshHistory();
  }, [fetchFreshHistory]);

  /**
   * Manual Re-fetch from API
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const emailQuery = userEmail ? `userEmail=${encodeURIComponent(userEmail)}` : "";
      const idQuery = userId ? `userId=${encodeURIComponent(userId)}` : "";
      const queryString = [emailQuery, idQuery].filter(Boolean).join("&");
      const url = `/api/projects${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          ...(userEmail ? { "x-user-email": userEmail } : {}),
          ...(userId ? { "x-user-id": userId } : {}),
        },
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          if (data?.success && Array.isArray(data.projects)) {
            setProjects(data.projects);
            showToast("History refreshed from database.");
            return;
          }
        }
      }

      // Guest fallback only if no authenticated user
      if (!userEmail && !userId) {
        const localData = localStorage.getItem("cleanpix_cutout_history");
        if (localData) {
          try {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed)) {
              const mapped: ProjectRecord[] = parsed.map((item: any) => ({
                id: item.id || `local-${Math.random()}`,
                originalUrl: item.originalUrl || item.cutoutUrl || "/images/hero-original.jpg",
                processedUrl: item.cutoutUrl || item.processedUrl || "/images/hero-cutout.jpg",
                detectedObject: item.category?.toLowerCase() || "cutout",
                status: "done",
                createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
              }));
              setProjects(mapped);
              showToast("History is up to date.");
              return;
            }
          } catch {}
        }
      }

      showToast("History is up to date.");
    } catch (err) {
      console.error("[REFRESH_ERROR]", err);
      showToast("Could not refresh history.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Real-time synchronization event listeners across tabs/components
  useEffect(() => {
    const handleProjectCreated = (e: any) => {
      const newProj = e.detail;
      if (newProj && newProj.id) {
        setProjects((prev) => {
          if (prev.some((p) => p.id === newProj.id)) return prev;
          return [newProj, ...prev];
        });
        showToast("New cutout added to history.");
      }
      fetchFreshHistory();
    };

    const handleHistoryRefresh = () => {
      fetchFreshHistory();
    };

    const handleProjectDeleted = (e: any) => {
      const deletedId = e.detail?.id;
      if (deletedId) {
        setProjects((prev) => prev.filter((p) => p.id !== deletedId));
      }
    };

    const handleAllDeleted = () => {
      setProjects([]);
    };

    const handlePlanUpdated = (e: any) => {
      if (e.detail?.plan) {
        setLivePlan(e.detail.plan);
      }
    };

    const handleCreditsUpdated = (e: any) => {
      if (typeof e.detail?.credits === "number") {
        setLiveCredits(e.detail.credits);
      }
    };

    window.addEventListener("cleanpix_project_created", handleProjectCreated);
    window.addEventListener("cleanpix_history_refresh", handleHistoryRefresh);
    window.addEventListener("cleanpix_project_deleted", handleProjectDeleted);
    window.addEventListener("cleanpix_project_all_deleted", handleAllDeleted);
    window.addEventListener("cleanpix_plan_updated", handlePlanUpdated);
    window.addEventListener("cleanpix_credits_updated", handleCreditsUpdated);

    return () => {
      window.removeEventListener("cleanpix_project_created", handleProjectCreated);
      window.removeEventListener("cleanpix_history_refresh", handleHistoryRefresh);
      window.removeEventListener("cleanpix_project_deleted", handleProjectDeleted);
      window.removeEventListener("cleanpix_project_all_deleted", handleAllDeleted);
      window.removeEventListener("cleanpix_plan_updated", handlePlanUpdated);
      window.removeEventListener("cleanpix_credits_updated", handleCreditsUpdated);
    };
  }, [fetchFreshHistory]);

  /**
   * Delete single project
   */
  const handleDelete = async (id: string) => {
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
        throw new Error(errorData.error?.message || "Failed to delete cutout from database.");
      }

      // 1. Confirmed deletion: update UI state
      setProjects((prev) => prev.filter((p) => p.id !== id));

      // 2. Broadcast single deletion event and history refresh to Dashboard and HistoryModal
      window.dispatchEvent(
        new CustomEvent("cleanpix_project_deleted", { detail: { id } })
      );
      window.dispatchEvent(new CustomEvent("cleanpix_history_refresh"));

      // 3. Update localStorage only if guest
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

      // 4. Fetch fresh history from Supabase
      await fetchFreshHistory();

      showToast("Cutout deleted from database.");
    } catch (err: any) {
      console.error("[DELETE_ERROR]", err);
      showToast(err.message || "Failed to delete cutout. Please try again.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  /**
   * Delete All History records
   */
  const handleDeleteAll = async () => {
    setIsDeletingAll(true);

    try {
      const emailQuery = userEmail ? `userEmail=${encodeURIComponent(userEmail)}` : "";
      const idQuery = userId ? `userId=${encodeURIComponent(userId)}` : "";
      const queryString = ["all=true", emailQuery, idQuery].filter(Boolean).join("&");
      const res = await fetch(`/api/projects?${queryString}`, {
        method: "DELETE",
        headers: {
          ...(userEmail ? { "x-user-email": userEmail } : {}),
          ...(userId ? { "x-user-id": userId } : {}),
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Failed to delete all history from database.");
      }

      // 1. Confirmed deletion: clear state
      setProjects([]);

      // 2. Broadcast event across tabs/components
      window.dispatchEvent(new CustomEvent("cleanpix_project_all_deleted"));
      window.dispatchEvent(new CustomEvent("cleanpix_history_refresh"));

      // 3. Clear localStorage only if guest
      if (!userEmail && !userId) {
        try {
          localStorage.removeItem("cleanpix_cutout_history");
        } catch {}
      }

      // 4. Re-fetch from Supabase to confirm empty state
      await fetchFreshHistory();

      showToast("All processing history deleted permanently.");
    } catch (err: any) {
      console.error("[DELETE_ALL_ERROR]", err);
      showToast(err.message || "Failed to delete all history.");
    } finally {
      setIsDeletingAll(false);
      setIsDeleteAllOpen(false);
    }
  };

  /**
   * Copy transparent PNG to clipboard
   */
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

  /**
   * Download Cutout
   */
  const handleDownload = (url: string, id: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `cleanpix_cutout_${id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Download started.");
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  // Filtered projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase().trim();
    return projects.filter((project) => {
      const originalName = project.originalUrl?.split("/").pop()?.toLowerCase() || "";
      const id = project.id.toLowerCase();
      const cat = (project.detectedObject || "").toLowerCase();
      return originalName.includes(query) || id.includes(query) || cat.includes(query);
    });
  }, [projects, searchQuery]);

  // Pagination calculation
  const totalPages = itemsPerPage === -1 ? 1 : Math.ceil(filteredProjects.length / itemsPerPage);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));

  const paginatedProjects = useMemo(() => {
    if (itemsPerPage === -1) return filteredProjects;
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProjects, safeCurrentPage, itemsPerPage]);

  const userPlan = livePlan || (session?.user as any)?.plan || initialUser?.plan || "free";
  const userCredits = liveCredits ?? (session?.user as any)?.credits ?? initialUser?.credits ?? 10;
  const userName = session?.user?.name || initialUser?.name || session?.user?.email?.split("@")[0] || initialUser?.email?.split("@")[0] || "User";

  return (
    <main className="min-h-screen bg-[#0A0B1E] text-[#F8FAFC] flex flex-col selection:bg-primary/40 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-[14px] bg-[#131A3A]/95 border border-primary/50 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(34,211,238,0.3)] animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <Sparkles size={13} className="text-accent" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {isDeleteAllOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05060F]/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isDeletingAll && setIsDeleteAllOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-[460px] rounded-[24px] bg-[#131A3A] border border-red-500/30 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(239,68,68,0.2)] flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-bold text-lg text-white">
                  Delete all history?
                </h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  This will permanently remove all {projects.length} processed images and history records from the database. This action cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteAllOpen(false)}
                disabled={isDeletingAll}
                className="p-1 text-text-muted hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteAllOpen(false)}
                disabled={isDeletingAll}
                className="px-4 py-2 rounded-btn text-xs font-semibold text-text-secondary hover:text-white bg-white/[0.05] hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={isDeletingAll}
                className="px-4 py-2 rounded-btn text-xs font-heading font-bold text-white bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingAll ? (
                  <span>Deleting All...</span>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0A0B1E]/85 backdrop-blur-2xl">
        <div className="max-w-[1440px] mx-auto px-3.5 sm:px-10 lg:px-16 h-16 sm:h-20 flex items-center justify-between gap-2 min-w-0">
          {/* Brand and Single Clear Back Navigation */}
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

            <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <img
                src="/branding/logo/cleanpix-icon.svg"
                alt="CleanPix Icon"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]"
              />
              <span className="font-heading font-bold text-lg sm:text-xl text-white tracking-tight hidden sm:inline">
                Clean<span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">Pix</span>
              </span>
            </Link>
          </div>

          {/* Right Header Actions: Refresh & Delete All */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* REFRESH BUTTON */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-btn font-heading font-semibold text-xs text-white bg-[#131A3A]/90 hover:bg-[#1B2350] border border-white/18 hover:border-primary/50 shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Re-fetch latest project records from the database"
            >
              <RefreshCw
                size={13}
                className={`text-accent shrink-0 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden xs:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            {/* DELETE ALL ACTION BUTTON */}
            {projects.length > 0 && (
              <button
                type="button"
                onClick={() => setIsDeleteAllOpen(true)}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-btn text-xs font-semibold text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/25 border border-red-500/25 hover:border-red-500/40 transition-all cursor-pointer shadow-sm shrink-0"
                title="Permanently remove all your history records"
              >
                <Trash2 size={13} />
                <span className="hidden xs:inline">Delete All</span>
                <span className="xs:hidden">Delete</span>
              </button>
            )}

            {/* Account / User Pill */}
            {(session?.user || initialUser) && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-pill bg-[#131A3A] border border-primary/30 shrink-0">
                <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                  {userName}
                </span>
                <span className={`px-2 py-0.5 rounded-pill border text-[10px] font-bold ${
                  userPlan.toLowerCase() === "pro"
                    ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                    : userPlan.toLowerCase() === "business"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-primary/25 border-primary/40 text-accent"
                }`}>
                  {userPlan.toLowerCase() === "pro"
                    ? "Pro"
                    : userPlan.toLowerCase() === "business"
                    ? "Business"
                    : "Free"}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-3.5 sm:px-10 lg:px-16 py-6 sm:py-10 flex-1 flex flex-col w-full min-w-0">
        {/* Page Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 w-full min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 sm:gap-3 mb-1 flex-wrap">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-accent shadow-[0_0_12px_rgba(34,211,238,0.4)] shrink-0">
                <History size={15} className="text-accent" />
              </div>
              <h1 className="font-heading font-extrabold text-xl sm:text-3xl text-white tracking-tight break-words">
                Processing History
              </h1>
              <span className="px-2.5 py-0.5 rounded-pill bg-white/[0.06] border border-white/10 text-xs font-mono font-semibold text-accent shrink-0">
                {projects.length} {projects.length === 1 ? "cutout" : "cutouts"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary">
              Review, copy, or download your complete AI background removal history.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
            <Link
              href="/dashboard"
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-btn text-xs font-semibold text-text-secondary hover:text-white bg-[#131A3A] border border-white/15 hover:border-white/30 transition-all cursor-pointer"
            >
              <Layers size={14} />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/"
              className="flex-1 sm:flex-none justify-center inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-btn font-heading font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(79,124,255,0.5)] hover:shadow-[0_0_30px_rgba(79,124,255,0.75)] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <UploadCloud size={15} />
              <span>New Upload</span>
            </Link>
          </div>
        </div>

        {/* Clean Search Toolbar */}
        {projects.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-3 sm:p-4 rounded-[18px] bg-[#131A3A]/70 border border-white/10 backdrop-blur-xl w-full min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 w-full max-w-full sm:max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search cutouts by filename..."
                className="w-full pl-9 pr-8 py-2 rounded-pill bg-[#0A0B1E] border border-white/15 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Page Size Selector */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-pill bg-[#0A0B1E] border border-white/15 text-xs text-text-secondary focus:outline-none focus:border-accent cursor-pointer shrink-0"
            >
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={48}>48 / page</option>
              <option value={-1}>Show All</option>
            </select>
          </div>
        )}

        {/* History Cards Grid */}
        {filteredProjects.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5 mb-8 w-full min-w-0">
              {paginatedProjects.map((project) => {
                const filename = project.originalUrl?.split("/").pop() || `Project_${project.id.slice(0, 6)}`;
                return (
                  <div
                    key={project.id}
                    className="group relative rounded-[18px] sm:rounded-[20px] bg-[#131A3A]/80 hover:bg-[#131A3A] border border-white/12 hover:border-primary/50 p-3.5 sm:p-4 flex flex-col justify-between gap-3 sm:gap-3.5 transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_12px_40px_rgba(79,124,255,0.25)] hover:-translate-y-0.5 w-full min-w-0"
                  >
                    {/* Compact 120x120 Thumbnail Stage */}
                    <div className="flex flex-col items-center gap-2.5 min-w-0 w-full">
                      <div className="relative w-[110px] h-[110px] sm:w-[120px] sm:h-[120px] rounded-[14px] sm:rounded-[16px] checkerboard-pattern border border-white/15 overflow-hidden flex items-center justify-center p-1.5 shadow-inner shrink-0 group-hover:border-primary/40 transition-colors">
                        <img
                          src={project.processedUrl || project.originalUrl}
                          alt={filename}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover rounded-[12px] filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-200"
                        />

                        {/* Category Pill Tag */}
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-pill bg-[#0A0B1E]/90 backdrop-blur-md border border-white/15 text-[9px] font-bold text-accent uppercase tracking-wider">
                          {project.detectedObject || "Cutout"}
                        </span>
                      </div>

                      {/* File Details */}
                      <div className="flex flex-col items-center text-center w-full min-w-0">
                        <h4
                          className="font-heading font-semibold text-xs sm:text-[13px] text-white truncate max-w-full"
                          title={filename}
                        >
                          {filename}
                        </h4>
                        <span className="text-[10.5px] text-text-muted mt-0.5 flex items-center gap-1 font-mono">
                          <Clock size={10} />
                          {formatTime(project.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Row */}
                    <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-1.5 w-full min-w-0">
                      {/* Copy Button */}
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(project.id, project.processedUrl || project.originalUrl)
                        }
                        className="flex-1 py-1.5 px-2 rounded-[10px] bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 text-xs font-semibold text-[#F8FAFC] transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 min-w-0"
                      >
                        {copiedId === project.id ? (
                          <>
                            <Check size={12} className="text-status-success shrink-0" />
                            <span className="text-status-success text-[11px] truncate">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} className="shrink-0" />
                            <span className="text-[11px] truncate">Copy PNG</span>
                          </>
                        )}
                      </button>

                      {/* Download Button */}
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(
                            project.processedUrl || project.originalUrl,
                            project.id
                          )
                        }
                        className="flex-1 py-1.5 px-2 rounded-[10px] bg-primary/20 hover:bg-primary/35 border border-primary/40 text-xs font-bold text-accent transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 min-w-0"
                      >
                        <Download size={12} className="shrink-0" />
                        <span className="text-[11px] truncate">Download</span>
                      </button>

                      {/* Delete Single Button */}
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id)}
                        disabled={deleteLoadingId === project.id}
                        className="p-1.5 rounded-[10px] text-text-muted hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                        title="Delete project from history"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls (when more than 1 page) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-auto">
                <div className="text-xs text-text-secondary font-mono">
                  Showing {(safeCurrentPage - 1) * itemsPerPage + 1}–{Math.min(safeCurrentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} cutouts
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage <= 1}
                    className="p-2 rounded-btn bg-[#131A3A] border border-white/15 text-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <div className="flex items-center gap-1 text-xs">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                      if (
                        pg === 1 ||
                        pg === totalPages ||
                        (pg >= safeCurrentPage - 1 && pg <= safeCurrentPage + 1)
                      ) {
                        return (
                          <button
                            key={pg}
                            type="button"
                            onClick={() => setCurrentPage(pg)}
                            className={`w-8 h-8 rounded-btn text-xs font-semibold transition-all cursor-pointer ${
                              safeCurrentPage === pg
                                ? "bg-primary text-white border border-accent shadow-sm"
                                : "bg-[#131A3A] text-text-secondary hover:text-white border border-white/10"
                            }`}
                          >
                            {pg}
                          </button>
                        );
                      }
                      if (pg === safeCurrentPage - 2 || pg === safeCurrentPage + 2) {
                        return <span key={pg} className="px-1 text-text-muted">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage >= totalPages}
                    className="p-2 rounded-btn bg-[#131A3A] border border-white/15 text-text-secondary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : projects.length > 0 ? (
          /* Search / Filter Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-[#131A3A] border border-white/15 flex items-center justify-center text-text-muted mb-3">
              <Search size={24} />
            </div>
            <h3 className="font-heading font-bold text-lg text-white mb-1">
              No matching cutouts
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mb-4">
              No history records matched your search.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 rounded-btn text-xs font-semibold text-accent bg-primary/20 border border-primary/35 hover:bg-primary/30 transition-all cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          /* Total Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#131A3A] border border-primary/30 flex items-center justify-center text-accent mb-4 shadow-[0_0_24px_rgba(79,124,255,0.3)]">
              <ImageIcon size={30} />
            </div>
            <h3 className="font-heading font-bold text-xl text-white mb-2">
              No processing history yet
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-6">
              Your completed background removals will appear here automatically.
            </p>
            <Link
              href="/"
              className="px-6 py-3 rounded-btn font-heading font-bold text-sm text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_24px_rgba(79,124,255,0.6)] hover:shadow-[0_0_36px_rgba(79,124,255,0.85)] hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Upload Image
            </Link>
          </div>
        )}
      </div>
    </main>
  );
};
