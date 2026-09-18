"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  X,
  History,
  Clock,
  Download,
  Copy,
  Trash2,
  Check,
  ImageIcon,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCutout?: (url: string) => void;
}

interface HistoryItem {
  id: string;
  originalName: string;
  cutoutUrl: string;
  timestamp: string;
  category?: string;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectCutout,
}) => {
  const { data: session } = useSession();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  /**
   * Re-fetch latest project records from database / localStorage
   */
  const loadHistory = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }

    try {
      // 1. Fetch from /api/projects for authenticated user
      const res = await fetch("/api/projects", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          const mapped: HistoryItem[] = data.projects.map((p: any) => ({
            id: p.id,
            originalName: p.originalUrl?.split("/").pop() || "cleanpix_cutout.png",
            cutoutUrl: p.processedUrl || p.originalUrl,
            timestamp: new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            category: p.detectedObject ? p.detectedObject.charAt(0).toUpperCase() + p.detectedObject.slice(1) : "Cutout",
          }));
          setHistoryItems(mapped);
          if (isManualRefresh) showToast("History refreshed from database.");
          return;
        }
      }

      // 2. Fallback to localStorage
      const stored = localStorage.getItem("cleanpix_cutout_history");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHistoryItems(parsed);
            if (isManualRefresh) showToast("History refreshed.");
            return;
          }
        } catch {}
      }

      setHistoryItems([]);
      if (isManualRefresh) showToast("History is up to date.");
    } catch (err) {
      console.error("[LOAD_HISTORY_MODAL_ERROR]", err);
      if (isManualRefresh) showToast("Failed to refresh history.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  // Real-time Event Listeners
  useEffect(() => {
    const handleProjectCreated = (e: any) => {
      const newProj = e.detail;
      if (newProj) {
        const newItem: HistoryItem = {
          id: newProj.id || `hist-${Date.now()}`,
          originalName: newProj.originalName || "cleanpix_cutout.png",
          cutoutUrl: newProj.processedUrl || newProj.cutoutUrl || "/images/hero-cutout.jpg",
          timestamp: "Just now",
          category: newProj.detectedObject || "Cutout",
        };
        setHistoryItems((prev) => {
          if (prev.some((item) => item.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
        showToast("New cutout added to history.");
      }
    };

    const handleProjectDeleted = (e: any) => {
      const deletedId = e.detail?.id;
      if (deletedId) {
        setHistoryItems((prev) => prev.filter((item) => item.id !== deletedId));
      }
    };

    const handleAllDeleted = () => {
      setHistoryItems([]);
    };

    window.addEventListener("cleanpix_project_created", handleProjectCreated);
    window.addEventListener("cleanpix_project_deleted", handleProjectDeleted);
    window.addEventListener("cleanpix_project_all_deleted", handleAllDeleted);

    return () => {
      window.removeEventListener("cleanpix_project_created", handleProjectCreated);
      window.removeEventListener("cleanpix_project_deleted", handleProjectDeleted);
      window.removeEventListener("cleanpix_project_all_deleted", handleAllDeleted);
    };
  }, []);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = async (id: string, url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      setCopiedId(id);
      showToast("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      navigator.clipboard.writeText(window.location.origin + url);
      setCopiedId(id);
      showToast("Copied link to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `cleanpix_${name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Download started.");
  };

  const handleDeleteItem = async (id: string) => {
    // 1. Immediately remove from current UI
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));

    // 2. Broadcast deletion
    window.dispatchEvent(
      new CustomEvent("cleanpix_project_deleted", { detail: { id } })
    );

    // 3. Update localStorage
    try {
      const localData = localStorage.getItem("cleanpix_cutout_history");
      if (localData) {
        const parsed = JSON.parse(localData);
        const filtered = parsed.filter((item: any) => item.id !== id);
        localStorage.setItem("cleanpix_cutout_history", JSON.stringify(filtered));
      }
    } catch {}

    // 4. Send API request to delete from database
    try {
      await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      showToast("Cutout removed.");
    } catch (err) {
      console.error("[DELETE_ITEM_ERROR]", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#05060F]/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="CleanPix Processing History"
    >
      <div
        className="relative w-full max-w-[760px] max-h-[85vh] rounded-[28px] bg-[#131A3A]/95 border border-primary/40 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(79,124,255,0.25)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast Mini Feedback */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-pill bg-[#0A0B1E]/95 border border-primary/50 text-[11px] font-semibold text-white shadow-lg animate-in fade-in duration-150 flex items-center gap-1.5">
            <Sparkles size={11} className="text-accent" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0A0B1E]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-accent shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              <History size={14} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-white">
                  History
                </h3>
                <span className="px-2 py-0.5 rounded-pill bg-primary/25 border border-primary/40 text-[10px] font-bold text-accent">
                  {session?.user?.email || "Account"}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Recent background removals & exports
              </p>
            </div>
          </div>

          {/* Header Action Buttons: Refresh + Close */}
          <div className="flex items-center gap-2">
            {/* REFRESH BUTTON IN HEADER */}
            <button
              type="button"
              onClick={() => loadHistory(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-semibold text-[#F8FAFC] hover:border-primary/40 transition-all cursor-pointer disabled:opacity-50"
              title="Re-fetch latest project records from the database"
            >
              <RefreshCw
                size={12}
                className={`text-accent ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* History Items Content */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[55vh] space-y-3">
          {historyItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-[18px] bg-[#0A0B1E]/90 border border-white/10 hover:border-primary/40 p-3.5 flex flex-col justify-between gap-3 transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 rounded-[12px] checkerboard-pattern border border-white/15 overflow-hidden shrink-0 flex items-center justify-center p-1 relative">
                      <img
                        src={item.cutoutUrl}
                        alt={item.originalName}
                        className="w-full h-full object-contain filter drop-shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">
                        {item.originalName}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-pill bg-white/[0.06] text-[10px] font-medium text-text-secondary">
                          {item.category || "Subject"}
                        </span>
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Clock size={10} />
                          {item.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 rounded-full text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete from history"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.cutoutUrl)}
                      className="flex-1 py-1 rounded-[8px] bg-white/[0.04] hover:bg-white/10 border border-white/8 text-[11px] font-medium text-text-secondary hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check size={11} className="text-status-success" />
                          <span className="text-status-success">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(item.cutoutUrl, item.originalName)}
                      className="flex-1 py-1 rounded-[8px] bg-primary/20 hover:bg-primary/30 border border-primary/30 text-[11px] font-bold text-accent transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Download size={11} />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-text-muted mb-3">
                <ImageIcon size={24} />
              </div>
              <h4 className="font-heading font-bold text-base text-white mb-1">
                No processing history yet
              </h4>
              <p className="text-xs text-text-secondary max-w-xs">
                Your completed background removals will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#0A0B1E]/60 flex items-center justify-between text-xs text-text-muted shrink-0">
          <Link
            href="/history"
            onClick={onClose}
            className="flex items-center gap-1.5 text-accent hover:underline font-semibold"
          >
            <span>Open Full History Page</span>
            <ExternalLink size={12} />
          </Link>

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
  );
};
