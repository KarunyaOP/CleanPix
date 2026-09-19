import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://smzjxlepvodusnqelksi.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
