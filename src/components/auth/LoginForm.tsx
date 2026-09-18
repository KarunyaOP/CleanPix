"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Mail, ArrowRight, CheckCircle2, Loader2, ShieldCheck, Zap } from "lucide-react";

interface LoginFormProps {
  onContinueAsGuest?: () => void;
  guestHref?: string;
  animateEntrance?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onContinueAsGuest,
  guestHref = "/",
  animateEntrance = true,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Mark splash as seen when viewing the login form
    try {
      sessionStorage.setItem("cleanpix_splash_seen", "true");
    } catch {
      // Ignore storage errors
    }

    // Check URL query error parameters
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlError = params.get("error");
        if (urlError) {
          if (urlError === "EmailSignin" || urlError === "EmailCreateAccount") {
            setErrorMessage("We couldn't send the magic link right now. Please check your email configuration or try again.");
          } else if (urlError === "OAuthSignin" || urlError === "OAuthCallback" || urlError === "OAuthCreateAccount") {
            setErrorMessage("Could not sign in with Google. Please try again.");
          } else if (urlError === "Configuration") {
            setErrorMessage("Authentication service configuration error. Please contact support.");
          } else if (urlError === "AccessDenied") {
            setErrorMessage("Access denied. You do not have permission to sign in.");
          } else {
            setErrorMessage("Sign-in failed. Please try again.");
          }
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const getTargetCallbackUrl = () => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const raw = params.get("callbackUrl") || params.get("redirect");
        if (raw) {
          if (raw === "pricing" || raw === "/pricing") return "/#pricing";
          if (raw.startsWith("/")) return raw;
          return `/${raw}`;
        }
      }
    } catch {}
    return guestHref || "/";
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const callbackUrl = getTargetCallbackUrl();
      await signIn("google", { callbackUrl });
    } catch (err: any) {
      setErrorMessage("Could not sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsEmailLoading(true);
    setErrorMessage(null);

    try {
      const callbackUrl = getTargetCallbackUrl();
      const res = await signIn("email", {
        email,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        if (res.error === "EmailSignin" || res.error === "EmailCreateAccount") {
          setErrorMessage(
            "We couldn't send the magic link right now. Please check your email configuration or try again."
          );
        } else if (res.error === "Configuration") {
          setErrorMessage("Email service configuration issue. Please check your SMTP settings.");
        } else {
          setErrorMessage(
            "We couldn't send the magic link right now. Please check your email configuration or try again."
          );
        }
      } else {
        setIsEmailSent(true);
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGuestClick = (e: React.MouseEvent) => {
    try {
      sessionStorage.setItem("cleanpix_splash_seen", "true");
    } catch {
      // Ignore storage errors
    }
    if (onContinueAsGuest) {
      e.preventDefault();
      onContinueAsGuest();
    }
  };

  return (
    <motion.div
      initial={
        animateEntrance
          ? {
              opacity: 0,
              y: shouldReduceMotion ? 0 : 16,
              scale: shouldReduceMotion ? 1 : 0.985,
            }
          : false
      }
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: shouldReduceMotion ? 0.3 : 0.55,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="w-full max-w-[440px] rounded-[28px] bg-[#131A3A]/90 backdrop-blur-2xl border border-primary/35 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(79,124,255,0.2)] flex flex-col gap-6"
    >
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center gap-3">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-14 h-14 transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
            <img
              src="/branding/logo/cleanpix-icon.svg"
              alt="CleanPix Brand Icon"
              className="w-14 h-14 object-contain drop-shadow-[0_0_24px_rgba(0,240,255,0.55)]"
            />
          </div>
        </Link>

        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            Welcome to Clean<span className="bg-gradient-to-r from-[#38BDF8] via-[#818CF8] to-[#C084FC] bg-clip-text text-transparent">Pix</span>
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Sign in to save your background-removal history and export kits.
          </p>
        </div>
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 rounded-[14px] bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Success Confirmation for Email Magic Link */}
      {isEmailSent ? (
        <div className="p-5 rounded-[18px] bg-status-success/15 border border-status-success/40 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-status-success/20 flex items-center justify-center text-status-success shadow-[0_0_16px_rgba(34,197,94,0.4)]">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Check Your Inbox</h3>
            <p className="text-xs text-text-secondary mt-1">
              We sent a secure magic link to <strong className="text-white">{email}</strong>. Click the link to log in.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEmailSent(false)}
            className="text-xs font-semibold text-accent hover:underline mt-1 cursor-pointer"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          {/* 1. Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isEmailLoading}
            className="w-full py-3.5 px-4 rounded-btn font-heading font-bold text-sm text-white bg-white/[0.07] hover:bg-white/[0.12] border border-white/20 hover:border-white/40 shadow-sm transition-all duration-150 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]"
          >
            {isGoogleLoading ? (
              <Loader2 size={16} className="animate-spin text-accent" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              or with email
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* 2. Passwordless Email Magic Link Form */}
          <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3.5">
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-btn text-sm text-white bg-[#0A0B1E]/90 border border-white/15 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 transition-all placeholder:text-text-muted"
              />
            </div>

            <button
              type="submit"
              disabled={isEmailLoading || isGoogleLoading}
              className="w-full py-3.5 px-4 rounded-btn font-heading font-bold text-sm text-white bg-gradient-to-r from-[#4F7CFF] to-[#8B5CF6] shadow-[0_0_24px_rgba(79,124,255,0.6)] hover:shadow-[0_0_36px_rgba(79,124,255,0.85)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEmailLoading ? (
                <Loader2 size={16} className="animate-spin text-accent" />
              ) : (
                <Sparkles size={16} className="text-accent animate-pulse" />
              )}
              <span>Send Magic Link</span>
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              or explore
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* 3. Continue as Guest Option */}
          {onContinueAsGuest ? (
            <button
              type="button"
              onClick={handleGuestClick}
              className="w-full py-3.5 px-4 rounded-btn text-sm font-semibold text-white bg-[#131A3A]/90 hover:bg-[#1B2350] border border-white/20 hover:border-accent/50 shadow-sm hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] group"
            >
              <span>Continue as Guest</span>
              <ArrowRight size={15} className="text-accent group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <Link
              href={guestHref}
              onClick={handleGuestClick}
              className="w-full py-3.5 px-4 rounded-btn text-sm font-semibold text-white bg-[#131A3A]/90 hover:bg-[#1B2350] border border-white/20 hover:border-accent/50 shadow-sm hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] group"
            >
              <span>Continue as Guest</span>
              <ArrowRight size={15} className="text-accent group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </>
      )}

      {/* Trust Badges */}
      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-center gap-6 text-[11px] text-text-muted">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-status-success" />
          <span>Passwordless & Secure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={13} className="text-accent" />
          <span>Free Credits</span>
        </div>
      </div>
    </motion.div>
  );
};
