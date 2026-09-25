"use client";

export interface CachedProject {
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

interface ProjectsCacheData {
  projects: CachedProject[];
  totalProjects: number;
  totalProcessed: number;
  timestamp: number;
  userIdOrEmail: string;
}

const CACHE_KEY_PREFIX = "cleanpix_projects_cache_";
const MEMORY_CACHE = new Map<string, ProjectsCacheData>();
const IN_FLIGHT_FETCHES = new Map<string, Promise<CachedProject[]>>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Reads cached projects synchronously from memory or localStorage (0ms latency).
 */
export function getCachedProjects(userKey?: string): {
  projects: CachedProject[];
  totalProjects: number;
  totalProcessed: number;
  isStale: boolean;
} {
  if (typeof window === "undefined") {
    return { projects: [], totalProjects: 0, totalProcessed: 0, isStale: true };
  }

  const key = userKey?.trim().toLowerCase() || "guest";

  // 1. Check in-memory cache first
  const mem = MEMORY_CACHE.get(key);
  const now = Date.now();
  if (mem) {
    const isStale = now - mem.timestamp > CACHE_TTL_MS;
    return {
      projects: mem.projects,
      totalProjects: mem.totalProjects,
      totalProcessed: mem.totalProcessed,
      isStale,
    };
  }

  // 2. Check localStorage
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (raw) {
      const parsed: ProjectsCacheData = JSON.parse(raw);
      if (Array.isArray(parsed.projects)) {
        MEMORY_CACHE.set(key, parsed);
        const isStale = now - parsed.timestamp > CACHE_TTL_MS;
        return {
          projects: parsed.projects,
          totalProjects: parsed.totalProjects,
          totalProcessed: parsed.totalProcessed,
          isStale,
        };
      }
    }

    // 3. Fallback to guest cutout history
    if (key === "guest") {
      const guestRaw = localStorage.getItem("cleanpix_cutout_history");
      if (guestRaw) {
        const guestParsed = JSON.parse(guestRaw);
        if (Array.isArray(guestParsed)) {
          const mapped: CachedProject[] = guestParsed.map((item: any) => ({
            id: item.id || `local-${Math.random()}`,
            originalUrl: item.originalUrl || item.cutoutUrl || "/images/hero-original.jpg",
            processedUrl: item.cutoutUrl || item.processedUrl || "/images/hero-cutout.jpg",
            detectedObject: item.category?.toLowerCase() || item.detectedObject || "other",
            status: "done",
            createdAt: item.createdAt || new Date().toISOString(),
          }));
          return {
            projects: mapped,
            totalProjects: mapped.length,
            totalProcessed: mapped.length,
            isStale: false,
          };
        }
      }
    }
  } catch (err) {
    console.warn("[PROJECTS_CACHE_READ_WARN]", err);
  }

  return { projects: [], totalProjects: 0, totalProcessed: 0, isStale: true };
}

/**
 * Stores projects in memory + localStorage cache.
 */
export function setCachedProjects(userKey: string | undefined, projects: CachedProject[]): void {
  if (typeof window === "undefined") return;

  const key = userKey?.trim().toLowerCase() || "guest";
  const completedCount = projects.filter((p) => p.status === "done" || Boolean(p.processedUrl)).length;

  const cacheData: ProjectsCacheData = {
    projects,
    totalProjects: projects.length,
    totalProcessed: completedCount,
    timestamp: Date.now(),
    userIdOrEmail: key,
  };

  MEMORY_CACHE.set(key, cacheData);

  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(cacheData));
  } catch (err) {
    console.warn("[PROJECTS_CACHE_WRITE_WARN]", err);
  }
}

/**
 * Optimistically appends a newly created project to the cache immediately.
 */
export function optimisticallyAddProject(userKey: string | undefined, newProject: CachedProject): void {
  const current = getCachedProjects(userKey);
  const filtered = current.projects.filter((p) => p.id !== newProject.id);
  const updated = [newProject, ...filtered];
  setCachedProjects(userKey, updated);
}

/**
 * Optimistically removes a project from the cache immediately.
 */
export function optimisticallyDeleteProject(userKey: string | undefined, projectId: string): void {
  const current = getCachedProjects(userKey);
  const updated = current.projects.filter((p) => p.id !== projectId);
  setCachedProjects(userKey, updated);
}

/**
 * Clears all cached projects for a user.
 */
export function clearCachedProjects(userKey?: string): void {
  if (typeof window === "undefined") return;
  const key = userKey?.trim().toLowerCase() || "guest";
  MEMORY_CACHE.delete(key);
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
  } catch {}
}

/**
 * Fetches user projects with request deduplication and automatic caching.
 * Prevents multiple identical requests if Dashboard and History mount simultaneously.
 */
export async function fetchProjectsWithDeduplication(
  userEmail?: string | null,
  userId?: string | null,
  force = false
): Promise<CachedProject[]> {
  const userKey = userId || userEmail || "guest";

  // If cache is fresh and not forced, return cached data immediately
  if (!force) {
    const cached = getCachedProjects(userKey);
    if (!cached.isStale && cached.projects.length > 0) {
      return cached.projects;
    }
  }

  // Deduplicate inflight requests
  const inflight = IN_FLIGHT_FETCHES.get(userKey);
  if (inflight) {
    return inflight;
  }

  const fetchPromise = (async () => {
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
            setCachedProjects(userKey, data.projects);
            return data.projects;
          }
        }
      }

      // If fetch fails, return existing cache if available
      return getCachedProjects(userKey).projects;
    } catch (err) {
      console.warn("[FETCH_PROJECTS_DEDUP_WARN]", err);
      return getCachedProjects(userKey).projects;
    } finally {
      IN_FLIGHT_FETCHES.delete(userKey);
    }
  })();

  IN_FLIGHT_FETCHES.set(userKey, fetchPromise);
  return fetchPromise;
}
