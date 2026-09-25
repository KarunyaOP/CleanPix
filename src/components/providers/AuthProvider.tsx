"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase, getRedirectUrl } from "@/lib/supabaseClient";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

export interface CleanPixUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  credits: number;
  plan: string;
  authProvider?: string;
}

export interface AuthContextType {
  user: CleanPixUser | null;
  session: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  isLoading: boolean;
  signInWithOtp: (email: string, redirectTo?: string) => Promise<{ error: any; data: any }>;
  signOut: (options?: { callbackUrl?: string }) => Promise<void>;
  update: (data?: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  status: "loading",
  isLoading: true,
  signInWithOtp: async () => ({ error: new Error("AuthProvider not mounted"), data: null }),
  signOut: async () => {},
  update: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CleanPixUser | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const userRef = useRef<CleanPixUser | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Deduping and Background Profile Sync Tracker
  const inFlightSyncRef = useRef<Promise<CleanPixUser | null> | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const lastSyncEmailRef = useRef<string | null>(null);

  const buildOptimisticUser = useCallback((sbUser: SupabaseUser): CleanPixUser => {
    return {
      id: sbUser.id,
      email: sbUser.email!,
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || null,
      image: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
      credits: typeof sbUser.user_metadata?.credits === "number" ? sbUser.user_metadata.credits : 10,
      plan: sbUser.user_metadata?.plan || "free",
      authProvider: sbUser.app_metadata?.provider || "email",
    };
  }, []);

  const syncUserProfile = useCallback(
    async (sbUser: SupabaseUser, token?: string, force = false): Promise<CleanPixUser | null> => {
      if (!sbUser.email) return null;

      const emailNorm = sbUser.email.trim().toLowerCase();
      const now = Date.now();
      const isSameUser = lastSyncEmailRef.current === emailNorm;
      const isRecentlySynced = now - lastSyncTimestampRef.current < 30000; // 30s TTL

      // Skip duplicate sync if already processed recently unless explicitly forced
      if (!force && isSameUser && isRecentlySynced && !inFlightSyncRef.current) {
        return userRef.current;
      }

      if (inFlightSyncRef.current) {
        return inFlightSyncRef.current;
      }

      const syncPromise = (async () => {
        try {
          const res = await fetch("/api/auth/profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              email: sbUser.email,
              name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || null,
              image: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || null,
            }),
          });

          if (res.ok) {
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
              const data = await res.json().catch(() => null);
              if (data?.user) {
                const profileUser: CleanPixUser = {
                  id: data.user.id || sbUser.id,
                  email: data.user.email,
                  name: data.user.name || sbUser.user_metadata?.full_name || null,
                  image: data.user.image || sbUser.user_metadata?.avatar_url || null,
                  credits: typeof data.user.credits === "number" ? data.user.credits : 10,
                  plan: data.user.plan || "free",
                  authProvider: data.user.authProvider || sbUser.app_metadata?.provider || "email",
                };
                lastSyncTimestampRef.current = Date.now();
                lastSyncEmailRef.current = emailNorm;
                setUser(profileUser);
                return profileUser;
              }
            }
          }

          // Fallback to optimistic user without fabricating false plan
          const fallbackUser = buildOptimisticUser(sbUser);
          lastSyncTimestampRef.current = Date.now();
          lastSyncEmailRef.current = emailNorm;
          setUser((prev) => prev || fallbackUser);
          return fallbackUser;
        } catch (err) {
          console.warn("[AUTH_SYNC_PROFILE_WARN]", err);
          const fallbackUser = buildOptimisticUser(sbUser);
          setUser((prev) => prev || fallbackUser);
          return fallbackUser;
        } finally {
          inFlightSyncRef.current = null;
        }
      })();

      inFlightSyncRef.current = syncPromise;
      return syncPromise;
    },
    [buildOptimisticUser]
  );

  useEffect(() => {
    let isMounted = true;

    // 1. Restore active session instantaneously from local storage on mount (no blocking spinners)
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error("[SUPABASE_GET_SESSION_ERROR]", error);
      }
      if (initialSession?.user) {
        setSession(initialSession);
        const hydratedUser = buildOptimisticUser(initialSession.user);
        setUser(hydratedUser);
        // Instantly mark status as authenticated so dashboard and pages load immediately (<50ms)
        setStatus("authenticated");
        // Reconcile database profile in background
        syncUserProfile(initialSession.user, initialSession.access_token);
      } else {
        setSession(null);
        setUser(null);
        setStatus("unauthenticated");
      }
    });

    // 2. Listen for Supabase Auth state changes (Magic Link callback, Google Login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log(`[SUPABASE_AUTH_EVENT] ${event}`, { email: currentSession?.user?.email });
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !currentSession?.user) {
        lastSyncEmailRef.current = null;
        lastSyncTimestampRef.current = 0;
        setSession(null);
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      if (currentSession?.user) {
        setSession(currentSession);
        const hydratedUser = buildOptimisticUser(currentSession.user);
        setUser(hydratedUser);
        setStatus("authenticated");

        // Avoid duplicate sync if event is INITIAL_SESSION and already processed by getSession()
        const isInitial = event === "INITIAL_SESSION";
        const isExplicitAuthChange =
          event === "SIGNED_IN" || event === "USER_UPDATED" || event === "TOKEN_REFRESHED";

        if (isExplicitAuthChange || (!isInitial && !lastSyncTimestampRef.current)) {
          syncUserProfile(currentSession.user, currentSession.access_token, isExplicitAuthChange);
        }
      }
    });

    // 3. Listen to local credit and plan updates dispatched within the app
    const handleCreditsUpdated = (e: any) => {
      if (typeof e.detail?.credits === "number") {
        setUser((prev) => {
          if (!prev) return null;
          return { ...prev, credits: e.detail.credits };
        });
      }
    };
    const handlePlanUpdated = (e: any) => {
      if (e.detail?.plan) {
        setUser((prev) => {
          if (!prev) return null;
          return { ...prev, plan: e.detail.plan };
        });
      }
    };

    window.addEventListener("cleanpix_credits_updated", handleCreditsUpdated);
    window.addEventListener("cleanpix_plan_updated", handlePlanUpdated);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("cleanpix_credits_updated", handleCreditsUpdated);
      window.removeEventListener("cleanpix_plan_updated", handlePlanUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithOtp = useCallback(async (email: string, callbackPath?: string) => {
    const emailRedirectTo = getRedirectUrl(callbackPath);
    console.log("[SUPABASE_SIGNIN_OTP_START]", { email, emailRedirectTo });

    const result = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
      },
    });

    if (result.error) {
      console.error("[SUPABASE_SIGNIN_OTP_ERROR]", result.error);
    } else {
      console.log("[SUPABASE_SIGNIN_OTP_SUCCESS]", result.data);
    }

    return result;
  }, []);

  const signOut = useCallback(async (options?: { callbackUrl?: string }) => {
    try {
      console.log("[SUPABASE_SIGNOUT_START]");
      lastSyncEmailRef.current = null;
      lastSyncTimestampRef.current = 0;
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setStatus("unauthenticated");
      if (typeof window !== "undefined") {
        window.location.href = options?.callbackUrl || "/";
      }
    } catch (err) {
      console.error("[SUPABASE_SIGNOUT_ERROR]", err);
    }
  }, []);

  const update = useCallback(async (newData?: any) => {
    if (session?.user) {
      if (newData?.credits !== undefined) {
        setUser((prev) => {
          if (!prev) return null;
          return { ...prev, credits: newData.credits };
        });
      }
      if (newData?.plan !== undefined) {
        setUser((prev) => {
          if (!prev) return null;
          return { ...prev, plan: newData.plan };
        });
      }
      await syncUserProfile(session.user, session.access_token, true);
    }
  }, [session, syncUserProfile]);

  const contextValue = useMemo(
    () => ({
      user,
      session,
      status,
      isLoading: status === "loading",
      signInWithOtp,
      signOut,
      update,
    }),
    [user, session, status, signInWithOtp, signOut, update]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

/**
 * NextAuth compatibility hook so existing components continue to work seamlessly.
 */
export const useSession = () => {
  const { user, session, status, update } = useContext(AuthContext);

  const isReady = status === "authenticated" && Boolean(user);

  return useMemo(
    () => ({
      data: isReady
        ? {
            user: user!,
            expires: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : "",
          }
        : null,
      status: isReady ? "authenticated" : status === "unauthenticated" ? "unauthenticated" : "loading",
      update,
    }),
    [isReady, user, session?.expires_at, status, update]
  );
};

export const signOut = async (options?: { callbackUrl?: string }) => {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = options?.callbackUrl || "/";
  }
};
