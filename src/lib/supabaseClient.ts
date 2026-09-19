import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Standard Supabase URL for CleanPix project
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://smzjxlepvodusnqelksi.supabase.co";

// Fallback dummy key to prevent build-time crashes when env vars are not yet injected during static generation
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtemp4bGVwdm9kdXNucWVsa3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY3MjAwMDAsImV4cCI6MjA0MjI5NjAwMH0.placeholder";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  FALLBACK_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(key && key !== FALLBACK_ANON_KEY && !key.includes("placeholder"));
};

export const validateSupabaseConfig = () => {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") {
      console.warn(
        "[SUPABASE_CONFIG_WARNING] NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured or using fallback key. Please ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is set in your Vercel Project Settings."
      );
    }
  }
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const getRedirectUrl = (callbackPath?: string): string => {
  let origin = "https://cleanpix-one.vercel.app";
  if (typeof window !== "undefined" && window.location.origin) {
    origin = window.location.origin;
  }

  if (callbackPath) {
    const cleanPath = callbackPath.startsWith("/") ? callbackPath : `/${callbackPath}`;
    return `${origin}${cleanPath}`;
  }

  return `${origin}/`;
};
