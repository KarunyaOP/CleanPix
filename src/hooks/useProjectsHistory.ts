"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/components/providers/AuthProvider";

export interface ProjectHistoryRecord {
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

export interface HistoryStats {
  totalProjects: number;
  totalProcessed: number;
}

const CACHE_KEY = "cleanpix_projects_history_v2";
const LEGACY_CACHE_KEYS = ["cleanpix_projects_history_cache", "cleanpix_projects_history"];

// In-memory module cache for instant cross-component synchronization
let globalProjectsCache: ProjectHistoryRecord[] | null = null;
let globalInFlightPromise: Promise<ProjectHistoryRecord[]> | null = null;
let globalLastFetchTime = 0;

/**
 * Filter out or sanitize legacy e_background_removal records from cached data
 */
function sanitizeProjectsList(list: any[]): ProjectHistoryRecord[] {
  if (!Array.isArray(list)) return [];
  return list.filter((p) => {
    if (!p || typeof p !== "object") return false;
    // If project has legacy unmigrated e_background_removal URL, ignore stale cached version
    if (typeof p.processedUrl === "string" && p.processedUrl.includes("e_background_removal")) {
      return false;
    }
    return true;
  });
}

export function useProjectsHistory() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";
  const userId = session?.user?.id || "";

  const [projects, setProjects] = useState<ProjectHistoryRecord[]>(() => {
    if (globalProjectsCache) return globalProjectsCache;
    if (typeof window !== "undefined") {
      try {
        // Purge legacy stale cache keys
        LEGACY_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));

        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const sanitized = sanitizeProjectsList(parsed);
          if (sanitized.length > 0) {
            globalProjectsCache = sanitized;
            return sanitized;
          }
        }
      } catch {}
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => !globalProjectsCache);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const stats: HistoryStats = {
    totalProjects: projects.length,
    totalProcessed: projects.filter(
      (p) => p.status === "done" || Boolean(p.processedUrl)
    ).length,
  };

  /**
   * Save to memory & localStorage cache
   */
  const updateGlobalCache = useCallback((updatedProjects: ProjectHistoryRecord[]) => {
    const sanitized = sanitizeProjectsList(updatedProjects);
    globalProjectsCache = sanitized;
    setProjects(sanitized);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(sanitized));
      } catch {}
    }
  }, []);

  /**
   * Fetch fresh projects from backend
   */
  const fetchProjects = useCallback(
    async (force = false): Promise<ProjectHistoryRecord[]> => {
      const now = Date.now();
      if (!force && globalProjectsCache && now - globalLastFetchTime < 10000) {
        return globalProjectsCache;
      }

      if (globalInFlightPromise && !force) {
        return globalInFlightPromise;
      }

      const emailQuery = userEmail ? `userEmail=${encodeURIComponent(userEmail)}` : "";
      const idQuery = userId ? `userId=${encodeURIComponent(userId)}` : "";
      const queryString = [emailQuery, idQuery].filter(Boolean).join("&");
      const url = `/api/projects${queryString ? `?${queryString}` : ""}`;

      const fetchPromise = (async () => {
        try {
          const res = await fetch(url, {
            headers: {
              "Cache-Control": "no-cache",
              ...(userEmail ? { "x-user-email": userEmail } : {}),
              ...(userId ? { "x-user-id": userId } : {}),
            },
          });

          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.success && Array.isArray(data.projects)) {
              globalLastFetchTime = Date.now();
              updateGlobalCache(data.projects);
              setError(null);
              return data.projects;
            }
          }
          return globalProjectsCache || [];
        } catch (err: any) {
          console.warn("[PROJECTS_HISTORY_FETCH_WARN]", err);
          setError(err.message || "Failed to load project history");
          return globalProjectsCache || [];
        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
          globalInFlightPromise = null;
        }
      })();

      globalInFlightPromise = fetchPromise;
      return fetchPromise;
    },
    [userEmail, userId, updateGlobalCache]
  );

  // Initial fetch on mount or auth change
  useEffect(() => {
    fetchProjects(false);
  }, [fetchProjects]);

  /**
   * Manual refresh handler
   */
  const refreshHistory = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProjects(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("cleanpix_projects_refreshed"));
    }
  }, [fetchProjects]);

  /**
   * Add new project instantaneously (e.g. from background removal completion)
   */
  const addProject = useCallback(
    (newProject: ProjectHistoryRecord) => {
      setProjects((prev) => {
        // Prevent duplicates
        const exists = prev.some(
          (p) => p.id === newProject.id || (p.processedUrl && p.processedUrl === newProject.processedUrl)
        );
        if (exists) return prev;
        const updated = [newProject, ...prev];
        updateGlobalCache(updated);
        return updated;
      });
    },
    [updateGlobalCache]
  );

  /**
   * Delete single project from database and cache
   */
  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const emailQuery = userEmail ? `userEmail=${encodeURIComponent(userEmail)}` : "";
        const idQuery = userId ? `userId=${encodeURIComponent(userId)}` : "";
        const queryString = [`id=${encodeURIComponent(id)}`, emailQuery, idQuery]
          .filter(Boolean)
          .join("&");

        const res = await fetch(`/api/projects?${queryString}`, {
          method: "DELETE",
          headers: {
            ...(userEmail ? { "x-user-email": userEmail } : {}),
            ...(userId ? { "x-user-id": userId } : {}),
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Failed to delete project");
        }

        setProjects((prev) => {
          const updated = prev.filter((p) => p.id !== id);
          updateGlobalCache(updated);
          return updated;
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cleanpix_project_deleted", { detail: { id } })
          );
        }
        return true;
      } catch (err: any) {
        console.error("[PROJECT_DELETE_ERROR]", err);
        throw err;
      }
    },
    [userEmail, userId, updateGlobalCache]
  );

  /**
   * Delete all projects
   */
  const deleteAllProjects = useCallback(async (): Promise<boolean> => {
    try {
      const emailQuery = userEmail ? `userEmail=${encodeURIComponent(userEmail)}` : "";
      const idQuery = userId ? `userId=${encodeURIComponent(userId)}` : "";
      const queryString = [`all=true`, emailQuery, idQuery].filter(Boolean).join("&");

      const res = await fetch(`/api/projects?${queryString}`, {
        method: "DELETE",
        headers: {
          ...(userEmail ? { "x-user-email": userEmail } : {}),
          ...(userId ? { "x-user-id": userId } : {}),
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Failed to delete all projects");
      }

      updateGlobalCache([]);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("cleanpix_all_projects_deleted"));
      }
      return true;
    } catch (err: any) {
      console.error("[DELETE_ALL_PROJECTS_ERROR]", err);
      throw err;
    }
  }, [userEmail, userId, updateGlobalCache]);

  // Synchronize with external events dispatched from other components
  useEffect(() => {
    const handleProjectCreated = (e: any) => {
      if (e.detail?.project) {
        addProject(e.detail.project);
      }
    };

    const handleProjectDeleted = (e: any) => {
      if (e.detail?.id) {
        setProjects((prev) => {
          const updated = prev.filter((p) => p.id !== e.detail.id);
          globalProjectsCache = updated;
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
      }
    };

    const handleAllDeleted = () => {
      updateGlobalCache([]);
    };

    const handleProjectsRefreshed = () => {
      fetchProjects(true);
    };

    window.addEventListener("cleanpix_project_created", handleProjectCreated);
    window.addEventListener("cleanpix_project_deleted", handleProjectDeleted);
    window.addEventListener("cleanpix_all_projects_deleted", handleAllDeleted);
    window.addEventListener("cleanpix_projects_refreshed", handleProjectsRefreshed);

    return () => {
      window.removeEventListener("cleanpix_project_created", handleProjectCreated);
      window.removeEventListener("cleanpix_project_deleted", handleProjectDeleted);
      window.removeEventListener("cleanpix_all_projects_deleted", handleAllDeleted);
      window.removeEventListener("cleanpix_projects_refreshed", handleProjectsRefreshed);
    };
  }, [addProject, updateGlobalCache, fetchProjects]);

  return {
    projects,
    stats,
    isLoading,
    isRefreshing,
    error,
    refreshHistory,
    addProject,
    deleteProject,
    deleteAllProjects,
  };
}
