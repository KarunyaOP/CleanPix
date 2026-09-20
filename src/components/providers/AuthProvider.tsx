"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  const inFlightSyncRef = useRef<Promise<CleanPixUser | null> | null>(null);

  const syncUserProfile = useCallback(async (sbUser: SupabaseUser, token?: string): Promise<CleanPixUser | null> => {
    if (!sbUser.email) return null;
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
          const data = await res.json();
          if (data?.user) {
            const profileUser: CleanPixUser = {
              id: data.user.id || sbUser.id,
              email: data.user.email,
              name: data.user.name || sbUser.user_metadata?.full_name || null,
              image: data.user.image || sbUser.user_metadata?.avatar_url || null,
              credits: typeof data.user.credits === "number" ? data.user.credits : 10,
              plan: data.user.plan || "free",
              authProvider: data.user.authProvider || "email",
            };
            setUser(profileUser);
            return profileUser;
          }
        }

        // If backend fails, only fallback to metadata without fabricating false plan
        const fallbackUser: CleanPixUser = {
          id: sbUser.id,
          email: sbUser.email!,
          name: sbUser.user_metadata?.full_name || null,
          image: sbUser.user_metadata?.avatar_url || null,
          credits: typeof sbUser.user_metadata?.credits === "number" ? sbUser.user_metadata.credits : 10,
          plan: sbUser.user_metadata?.plan || "free",
          authProvider: "email",
        };
        setUser((prev) => prev || fallbackUser);
        return fallbackUser;
      } catch (err) {
        console.warn("[AUTH_SYNC_PROFILE_WARN]", err);
        const fallbackUser: CleanPixUser = {
          id: sbUser.id,
          email: sbUser.email!,
          name: sbUser.user_metadata?.full_name || null,
          image: sbUser.user_metadata?.avatar_url || null,
          credits: typeof sbUser.user_metadata?.credits === "number" ? sbUser.user_metadata.credits : 10,
          plan: sbUser.user_metadata?.plan || "free",
          authProvider: "email",
        };
        setUser((prev) => prev || fallbackUser);
        return fallbackUser;
      } finally {
        inFlightSyncRef.current = null;
      }
    })();

    inFlightSyncRef.current = syncPromise;
    return syncPromise;
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Check active session on mount
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.error("[SUPABASE_GET_SESSION_ERROR]", error);
      }
      if (initialSession?.user) {
        setSession(initialSession);
        // Hydrate real database profile BEFORE setting status to authenticated
        await syncUserProfile(initialSession.user, initialSession.access_token);
        if (isMounted) {
          setStatus("authenticated");
        }
      } else {
        setSession(null);
        setUser(null);
        setStatus("unauthenticated");
      }
    });

    // 2. Listen for Supabase Auth state changes (Magic Link callback, login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[SUPABASE_AUTH_EVENT] ${event}`, { email: currentSession?.user?.email });
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !currentSession?.user) {
        setSession(null);
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      if (currentSession?.user) {
        setSession(currentSession);
        await syncUserProfile(currentSession.user, currentSession.access_token);
        if (isMounted) {
          setStatus("authenticated");
        }
      }
    });

    // 3. Listen to local credit and plan updates dispatched within the app
    const handleCreditsUpdated = (e: any) => {
      if (typeof e.detail?.credits === "number") {
        setUser((prev) => (prev ? { ...prev, credits: e.detail.credits } : null));
      }
    };
    const handlePlanUpdated = (e: any) => {
      if (e.detail?.plan) {
        setUser((prev) => (prev ? { ...prev, plan: e.detail.plan } : null));
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
  }, [syncUserProfile]);

  const signInWithOtp = async (email: string, callbackPath?: string) => {
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
  };

  const signOut = async (options?: { callbackUrl?: string }) => {
    try {
      console.log("[SUPABASE_SIGNOUT_START]");
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
  };

  const update = async (newData?: any) => {
    if (session?.user) {
      if (newData?.credits !== undefined) {
        setUser((prev) => (prev ? { ...prev, credits: newData.credits } : null));
      }
      if (newData?.plan !== undefined) {
        setUser((prev) => (prev ? { ...prev, plan: newData.plan } : null));
      }
      await syncUserProfile(session.user, session.access_token);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        status,
        isLoading: status === "loading",
        signInWithOtp,
        signOut,
        update,
      }}
    >
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

  return {
    data: isReady
      ? {
          user: user!,
          expires: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : "",
        }
      : null,
    status: isReady ? "authenticated" : status === "unauthenticated" ? "unauthenticated" : "loading",
    update,
  };
};

export const signOut = async (options?: { callbackUrl?: string }) => {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = options?.callbackUrl || "/";
  }
};
