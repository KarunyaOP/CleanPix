"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/components/providers/AuthProvider";
import {
  X,
  Sparkles,
  Zap,
  Check,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  Info,
} from "lucide-react";

export interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: "pro" | "business";
  autoTrigger?: boolean;
  title?: string;
  description?: string;
  badge?: string;
  buttonText?: string;
  onAction?: () => void;
}

/**
 * Dynamically loads Razorpay Checkout SDK script on-demand
 */
const loadRazorpaySdk = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const existingScript = document.getElementById("razorpay-checkout-sdk");
    if (existingScript) {
      if ((window as any).Razorpay) return resolve(true);
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  initialPlan = "pro",
  autoTrigger = false,
  title,
  description,
  badge,
  buttonText,
  onAction,
}) => {
  const { data: session, update: updateSession } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "business">(initialPlan);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionPlan = ((session?.user as any)?.plan || "free").toLowerCase();
  const isAlreadyBusiness = sessionPlan === "business" || sessionPlan === "enterprise";
  const isAlreadyPro = sessionPlan === "pro";

  // Check if current selected tab matches user's current or lower plan
  const isCurrentPlanSelected =
    (selectedPlan === "pro" && (isAlreadyPro || isAlreadyBusiness)) ||
    (selectedPlan === "business" && isAlreadyBusiness);

  // Sync selected plan with initialPlan when modal opens
  useEffect(() => {
    if (isOpen) {
      // If user is on Pro, default modal tab to "business" unless explicitly asked
      if (isAlreadyPro && initialPlan === "pro") {
        setSelectedPlan("business");
      } else {
        setSelectedPlan(initialPlan || "pro");
      }
      setIsLoading(false);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, initialPlan, isAlreadyPro]);

  // Auto-trigger Razorpay Checkout if requested and user is authenticated
  useEffect(() => {
    if (isOpen && autoTrigger && session?.user?.email && !isLoading && !isSuccess) {
      const planToTrigger = (isAlreadyPro && initialPlan === "pro") ? "business" : (initialPlan || "pro");
      handlePrimaryClick(planToTrigger);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, autoTrigger]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  const handlePrimaryClick = async (targetPlanOverride?: "pro" | "business") => {
    if (isLoading || isSuccess) return;
    const planToCheckout = targetPlanOverride || selectedPlan;

    if (onAction) {
      onAction();
      return;
    }

    if (buttonText === "View Plans & Pricing") {
      onClose();
      if (typeof window !== "undefined") {
        const pricingSection = document.getElementById("pricing");
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: "smooth" });
        } else {
          window.location.href = "/#pricing";
        }
      }
      return;
    }

    const userEmail = session?.user?.email || "";
    const userId = session?.user?.id || "";
    const userName = session?.user?.name || "";

    // If not authenticated, save pending plan and redirect to login
    if (!userEmail) {
      try {
        sessionStorage.setItem("cleanpix_pending_plan", planToCheckout);
        document.cookie = `cleanpix_pending_plan=${planToCheckout}; path=/; max-age=3600; SameSite=Lax`;
      } catch {}
      window.location.href = `/login?redirect=pricing&plan=${planToCheckout}`;
      return;
    }

    // Plan Guard: Prevent duplicate order creation
    if (isAlreadyBusiness) {
      setErrorMessage("You already have the Business plan.");
      return;
    }

    if (planToCheckout === "pro" && isAlreadyPro) {
      setErrorMessage("You already have the Pro plan.");
      return;
    }

    // Razorpay One-Time Payment Flow for planToCheckout (Pro ₹99 or Business ₹399)
    try {
      setIsLoading(true);
      setErrorMessage(null);

      // 1. Ensure Razorpay SDK script is loaded
      const isSdkLoaded = await loadRazorpaySdk();
      if (!isSdkLoaded) {
        throw new Error("Unable to load Razorpay payment SDK. Please check your internet connection.");
      }

      // 2. Request Order from server for selected plan
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userEmail ? { "x-user-email": userEmail } : {}),
          ...(userId ? { "x-user-id": userId } : {}),
        },
        body: JSON.stringify({
          plan: planToCheckout,
          userEmail,
          userId,
          userName,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        if (orderResponse.status === 401) {
          try {
            sessionStorage.setItem("cleanpix_pending_plan", planToCheckout);
            document.cookie = `cleanpix_pending_plan=${planToCheckout}; path=/; max-age=3600; SameSite=Lax`;
          } catch {}
          window.location.href = `/login?redirect=pricing&plan=${planToCheckout}`;
          return;
        }
        throw new Error(orderData.error || "Failed to initialize payment order.");
      }

      const { orderId, amount, currency, keyId } = orderData;

      if (!orderId || !keyId) {
        throw new Error("Invalid payment order received from server.");
      }

      const planName = planToCheckout === "business" ? "CleanPix Business" : "CleanPix Pro Creator";
      const planDesc =
        planToCheckout === "business"
          ? "Business - Unlimited AI Removals, Priority Queue & Commercial Rights"
          : "Pro Creator - Unlimited AI Background Removal";

      // 3. Initialize Razorpay Checkout Options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency || "INR",
        name: planName,
        description: planDesc,
        image: "/branding/logo/cleanpix-icon.svg",
        order_id: orderId,
        prefill: {
          name: userName || orderData.user?.name || "",
          email: userEmail || orderData.user?.email || "",
        },
        theme: {
          color: planToCheckout === "business" ? "#F59E0B" : "#4F7CFF",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            setIsLoading(true);

            // 4. Verify Payment on Server
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(userEmail ? { "x-user-email": userEmail } : {}),
                ...(userId ? { "x-user-id": userId } : {}),
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planToCheckout,
                userEmail,
                userId,
                userName,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment signature verification failed.");
            }

            // 5. Upgrade Success: Update Session & Disseminate Events
            setIsSuccess(true);
            setIsLoading(false);

            if (typeof updateSession === "function") {
              await updateSession({ plan: planToCheckout }).catch(() => {});
            }

            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("cleanpix_plan_updated", { detail: { plan: planToCheckout } })
              );
              window.dispatchEvent(
                new CustomEvent("cleanpix_credits_updated", { detail: { credits: 999999 } })
              );
            }

            // Auto-close after celebratory feedback
            setTimeout(() => {
              onClose();
            }, 2500);
          } catch (verifyErr: any) {
            console.error("[RAZORPAY_VERIFY_CLIENT_ERROR]", verifyErr);
            setErrorMessage(verifyErr.message || "Payment verification failed. Please contact support.");
            setIsLoading(false);
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);

      razorpayInstance.on("payment.failed", function (failResponse: any) {
        console.error("[RAZORPAY_PAYMENT_FAILED]", failResponse);
        setErrorMessage(
          failResponse.error?.description || "Payment failed or was cancelled. Please try again."
        );
        setIsLoading(false);
      });

      razorpayInstance.open();
    } catch (err: any) {
      console.error("[RAZORPAY_CHECKOUT_ERROR]", err);
      setErrorMessage(err.message || "An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentTitle =
    title ||
    (selectedPlan === "business"
      ? "Upgrade to CleanPix Business"
      : "Upgrade to Pro Creator");

  const currentDesc =
    description ||
    (selectedPlan === "business"
      ? "Unlock commercial rights, priority AI processing queue, bulk upload support, and 25MB file limits."
      : "Unlock unlimited AI background removals, 2x HD sharpening, and full Social Media Kits.");

  const currentBadge =
    badge || (selectedPlan === "business" ? "Business Commercial Plan" : "Pro Creator Plan");

  const currentButtonText = isAlreadyBusiness
    ? "You already have the Business plan."
    : selectedPlan === "pro" && isAlreadyPro
    ? "You already have the Pro plan."
    : buttonText ||
      (selectedPlan === "business" ? "Get Business for ₹399" : "Get Pro Creator for ₹99");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#05060F]/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade CleanPix Plan"
    >
      <div
        className="relative w-full max-w-[540px] my-auto rounded-[22px] sm:rounded-[28px] bg-[#131A3A]/95 border border-primary/40 shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(79,124,255,0.3)] overflow-hidden flex flex-col p-4 sm:p-8 animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div
          className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[70px] pointer-events-none transition-all duration-300 ${
            selectedPlan === "business" ? "bg-amber-500/20" : "bg-primary/20"
          }`}
        />

        {/* Close Button */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-10 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {isSuccess ? (
          /* Success Celebratory View */
          <div className="flex flex-col items-center text-center py-6 gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-status-success/20 border-2 border-status-success/50 flex items-center justify-center text-status-success shadow-[0_0_30px_rgba(34,197,94,0.5)]">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-status-success/20 border border-status-success/35 text-[11px] font-bold text-status-success mb-2">
                <Sparkles size={12} />
                <span>Payment Successful</span>
              </div>
              <h3 className="font-heading font-extrabold text-2xl text-white tracking-tight">
                {selectedPlan === "business"
                  ? "Welcome to CleanPix Business!"
                  : "Welcome to CleanPix Pro Creator!"}
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary mt-2 leading-relaxed max-w-sm">
                {selectedPlan === "business"
                  ? "Your account now has Priority AI processing, commercial rights, bulk upload support, and unlimited credits."
                  : "Your account now has unlimited AI background removals, 2x HD AI edge sharpening, and full Social Media Kits."}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full py-3.5 px-4 rounded-btn font-heading font-bold text-sm text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_24px_rgba(79,124,255,0.6)] cursor-pointer"
            >
              Start Creating Now
            </button>
          </div>
        ) : (
          /* Normal Checkout View */
          <>
            {/* Header with Icon */}
            <div className="flex flex-col items-center text-center gap-3 mb-5">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-[0_0_24px_rgba(79,124,255,0.7)] transition-all duration-300 ${
                  selectedPlan === "business"
                    ? "bg-gradient-to-tr from-amber-500 to-amber-600 shadow-[0_0_24px_rgba(245,158,11,0.6)]"
                    : "bg-gradient-to-tr from-primary to-secondary"
                }`}
              >
                {selectedPlan === "business" ? (
                  <Building2 size={26} className="text-white" />
                ) : (
                  <Zap size={26} className="text-white fill-current" />
                )}
              </div>

              <div>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-[11px] font-bold mb-2 ${
                    selectedPlan === "business"
                      ? "bg-amber-500/20 border border-amber-500/35 text-amber-300"
                      : "bg-primary/20 border border-primary/35 text-accent"
                  }`}
                >
                  <Sparkles size={12} />
                  <span>{currentBadge}</span>
                </div>
                <h3 className="font-heading font-extrabold text-2xl text-white tracking-tight">
                  {currentTitle}
                </h3>
                <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed max-w-sm">
                  {currentDesc}
                </p>
              </div>
            </div>

            {/* Interactive Plan Selector Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-[16px] bg-[#0A0B1E] border border-white/10 mb-4">
              <button
                type="button"
                onClick={() => setSelectedPlan("pro")}
                className={`py-2 px-3 rounded-[12px] text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  selectedPlan === "pro"
                    ? "bg-gradient-to-r from-primary to-secondary text-white shadow-[0_0_16px_rgba(79,124,255,0.5)]"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Pro Creator</span>
                  {isAlreadyPro && (
                    <span className="px-1.5 py-0.2 rounded-pill bg-purple-500/30 text-[9px] uppercase border border-purple-400/40 text-purple-200">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-[11px] opacity-90">₹99 one-time</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan("business")}
                className={`py-2 px-3 rounded-[12px] text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  selectedPlan === "business"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-[0_0_16px_rgba(245,158,11,0.5)]"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>Business</span>
                  {isAlreadyBusiness ? (
                    <span className="px-1.5 py-0.2 rounded-pill bg-amber-500/30 text-[9px] uppercase border border-amber-400/40 text-amber-200">
                      Active
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded-pill bg-white/20 text-[9px] uppercase">
                      PRO+
                    </span>
                  )}
                </div>
                <span className="text-[11px] opacity-90">₹399 one-time</span>
              </button>
            </div>

            {/* Plan-Aware Notice inside Modal */}
            {isCurrentPlanSelected && (
              <div className="mb-4 p-3 rounded-xl bg-primary/20 border border-primary/40 flex items-center gap-2.5 text-xs font-semibold text-white animate-in fade-in duration-200">
                <Info size={15} className="text-accent shrink-0" />
                <span>
                  {isAlreadyBusiness
                    ? "You already have the Business plan."
                    : "You already have the Pro plan."}
                </span>
              </div>
            )}

            {/* Plan Highlights Card */}
            <div className="p-4 rounded-[20px] bg-[#0A0B1E]/80 border border-white/10 mb-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm text-white">
                    {selectedPlan === "business" ? "Business Tier" : "Pro Creator Tier"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-pill text-[10px] font-bold text-white ${
                      selectedPlan === "business"
                        ? "bg-gradient-to-r from-amber-500 to-amber-600"
                        : "bg-gradient-to-r from-primary to-secondary"
                    }`}
                  >
                    Lifetime Access
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-heading font-extrabold text-base text-white">
                    {selectedPlan === "business" ? "₹399" : "₹99"}
                  </span>
                  <span className="text-[11px] text-text-secondary"> one-time</span>
                </div>
              </div>

              {selectedPlan === "business" ? (
                <div className="space-y-2 text-xs text-text-primary">
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-amber-400 shrink-0" />
                    <span>Everything included in Pro Creator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-amber-400 shrink-0" />
                    <span className="font-semibold text-white">Priority AI Processing Pipeline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-amber-400 shrink-0" />
                    <span>Bulk Upload Support (UI-Ready)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-amber-400 shrink-0" />
                    <span>Larger Upload Limit (Up to 25MB)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-amber-400 shrink-0" />
                    <span>Full Commercial Usage Rights Included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-amber-400 shrink-0" />
                    <span>Official Business Badge in Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-amber-400 shrink-0" />
                    <span className="flex items-center gap-1.5">
                      <span>Future API Access</span>
                      <span className="px-1.5 py-0.2 rounded-pill bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40">
                        Coming Soon
                      </span>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs text-text-primary">
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-status-success shrink-0" />
                    <span>Unlimited AI Background Removals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-status-success shrink-0" />
                    <span>2x HD AI Sharpening &amp; Enhancement</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-status-success shrink-0" />
                    <span>1-Click Social Media Kit Generator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-status-success shrink-0" />
                    <span>Smart Background Recommendations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check size={13} className="text-status-success shrink-0" />
                    <span>Full History &amp; Workspace Access</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error Alert if any */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-status-error/15 border border-status-error/30 flex items-start gap-2.5 text-xs text-red-300 animate-in fade-in duration-200">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-status-error" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={isLoading || isCurrentPlanSelected}
                onClick={() => handlePrimaryClick()}
                className={`w-full py-3.5 px-4 rounded-btn font-heading font-bold text-sm text-white shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none ${
                  isCurrentPlanSelected
                    ? "bg-white/[0.1] text-white/80 border border-white/20"
                    : selectedPlan === "business"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-[0_0_24px_rgba(245,158,11,0.6)] hover:shadow-[0_0_36px_rgba(245,158,11,0.85)]"
                    : "bg-gradient-to-r from-primary to-secondary shadow-[0_0_24px_rgba(79,124,255,0.6)] hover:shadow-[0_0_36px_rgba(79,124,255,0.85)]"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Opening Razorpay checkout...</span>
                  </>
                ) : (
                  <>
                    <span>{currentButtonText}</span>
                    {!isCurrentPlanSelected && <ArrowRight size={15} />}
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="w-full py-2 px-4 rounded-btn text-xs font-semibold text-text-secondary hover:text-white transition-colors text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isCurrentPlanSelected ? "Close" : "Maybe Later"}
              </button>
            </div>

            {/* Trust Footnote */}
            <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-center gap-2 text-[11px] text-text-muted">
              <ShieldCheck size={13} className="text-status-success" />
              <span>
                Secured by Razorpay • Instant{" "}
                {selectedPlan === "business" ? "Business" : "Pro Creator"} Activation
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
