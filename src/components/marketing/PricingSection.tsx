"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/components/providers/AuthProvider";
import { Check, Sparkles, Zap, Info, Building2, CheckCircle2, X } from "lucide-react";
import { UpgradeModal } from "@/components/pricing/UpgradeModal";

export const PricingSection: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState<"pro" | "business">("pro");
  const [cancelToast, setCancelToast] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [livePlan, setLivePlan] = useState<string | null>(null);
  const [isProcessingClick, setIsProcessingClick] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const hashQuery = window.location.hash.includes("?")
        ? new URLSearchParams(window.location.hash.split("?")[1])
        : null;

      if (params.get("payment") === "cancelled" || hashQuery?.get("payment") === "cancelled") {
        setCancelToast(true);
        const timer = setTimeout(() => setCancelToast(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Listen for live plan updates (e.g. after successful Razorpay checkout)
  useEffect(() => {
    const handlePlanUpdated = (e: any) => {
      if (e.detail?.plan) {
        setLivePlan(e.detail.plan.toLowerCase());
      }
    };
    window.addEventListener("cleanpix_plan_updated", handlePlanUpdated);
    return () => window.removeEventListener("cleanpix_plan_updated", handlePlanUpdated);
  }, []);

  const isPlanLoading = status === "loading";
  const isLoggedIn = status === "authenticated" || Boolean((session as any)?.user);
  const sessionPlan = ((session?.user as any)?.plan || "free").toLowerCase();
  const activePlan = livePlan || sessionPlan;

  const isBusiness = activePlan === "business" || activePlan === "enterprise";
  const isPro = activePlan === "pro";
  const isFree = !isPro && !isBusiness;

  const showNotice = (msg: string) => {
    setPlanNotice(msg);
    if (typeof window !== "undefined") {
      const timer = setTimeout(() => setPlanNotice(null), 4500);
      return () => clearTimeout(timer);
    }
  };

  const getProCta = () => {
    if (!isLoggedIn) return "Get Pro Creator";
    if (isPro) return "Current Plan";
    if (isBusiness) return "Included in Business";
    return "Upgrade to Pro";
  };

  const getBusinessCta = () => {
    if (!isLoggedIn) return "Get Business Plan";
    if (isBusiness) return "Current Plan";
    return "Upgrade to Business";
  };

  const getStarterCta = () => {
    if (!isLoggedIn) return "Start Free";
    if (isFree) return "Current Plan";
    return "Go to Editor";
  };

  const plans = [
    {
      id: "starter",
      name: "Starter",
      badge: "Free Forever",
      price: "₹0",
      period: "forever",
      description: "Ideal for quick personal edits and casual social sharing.",
      features: [
        "10 Free AI Cutout Credits",
        "Lossless Transparency Isolation",
        "Direct Clipboard Copy Support",
        "Single-Image Processing",
        "Standard Processing Pipeline",
      ],
      cta: getStarterCta(),
      popular: false,
      isBusiness: false,
      isCurrent: isLoggedIn && isFree,
    },
    {
      id: "pro",
      name: "Pro Creator",
      badge: "Most Popular",
      price: "₹99",
      period: "one-time",
      description: "For e-commerce sellers, marketers, and power content creators.",
      features: [
        "Unlimited AI Background Removals",
        "Unlimited Credits & Full History",
        "2x HD AI Sharpening & Enhancement",
        "1-Click Social Media Kit Generator",
        "Smart Background Recommendations",
        "Standard High-Speed AI Pipeline",
      ],
      cta: getProCta(),
      popular: true,
      isBusiness: false,
      isCurrent: isLoggedIn && isPro,
    },
    {
      id: "business",
      name: "Business",
      badge: "Commercial & Teams",
      price: "₹399",
      period: "one-time",
      description: "High-volume asset processing with commercial rights and priority queue.",
      features: [
        "Everything Included in Pro",
        "Priority AI Processing Queue",
        "Bulk Upload Support (UI-Ready)",
        "Larger Image Upload Limits (25MB)",
        "Full Commercial Usage Rights",
        "Official Business Dashboard Badge",
        "Future API Access (Coming Soon)",
      ],
      cta: getBusinessCta(),
      popular: false,
      isBusiness: true,
      isCurrent: isLoggedIn && isBusiness,
    },
  ];

  const handlePlanClick = (planId: string) => {
    if (isProcessingClick || isPlanLoading) return;
    setIsProcessingClick(true);
    setTimeout(() => setIsProcessingClick(false), 400);

    if (planId === "starter") {
      if (isLoggedIn) {
        if (pathname === "/") {
          const uploadSection = document.getElementById("top") || document.querySelector("section");
          if (uploadSection) {
            uploadSection.scrollIntoView({ behavior: "smooth" });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        } else {
          router.push("/#top");
        }
      } else {
        router.push("/login");
      }
      return;
    }

    if (planId === "pro") {
      if (!isLoggedIn) {
        router.push("/login?redirect=pricing");
        return;
      }

      // Pro Plan Guard
      if (isPro) {
        showNotice("You already have the Pro plan.");
        return;
      }

      if (isBusiness) {
        showNotice("You already have the Business plan.");
        return;
      }

      // Free user upgrading to Pro
      setModalPlan("pro");
      setIsUpgradeModalOpen(true);
      return;
    }

    if (planId === "business") {
      if (!isLoggedIn) {
        router.push("/login?redirect=pricing");
        return;
      }

      // Business Plan Guard
      if (isBusiness) {
        showNotice("You already have the Business plan.");
        return;
      }

      // Free or Pro user upgrading to Business
      setModalPlan("business");
      setIsUpgradeModalOpen(true);
      return;
    }
  };

  return (
    <>
      <section id="pricing" className="relative py-24 sm:py-32 border-t border-white/[0.08] scroll-mt-20">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
          {/* Section Header */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16 sm:mb-20">
            {/* Payment Cancelled Notice */}
            {cancelToast && (
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-white/10 border border-white/20 text-xs font-semibold text-text-primary animate-in fade-in slide-in-from-top-2 duration-200">
                <Info size={14} className="text-accent" />
                <span>Checkout was cancelled. No charges were made.</span>
              </div>
            )}

            {/* Plan-Aware Notice (e.g. "You already have the Pro plan.") */}
            {planNotice && (
              <div className="mb-5 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-pill bg-[#131A3A]/95 border border-primary/50 text-xs sm:text-sm font-semibold text-white shadow-[0_0_24px_rgba(79,124,255,0.4)] backdrop-blur-2xl animate-in fade-in slide-in-from-top-3 duration-200">
                <CheckCircle2 size={16} className="text-accent shrink-0" />
                <span>{planNotice}</span>
                <button
                  type="button"
                  onClick={() => setPlanNotice(null)}
                  className="ml-1 p-0.5 rounded-full text-text-muted hover:text-white transition-colors cursor-pointer"
                  aria-label="Dismiss notice"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-[#131A3A] border border-primary/30 text-xs font-semibold text-accent mb-4">
              <Zap size={13} />
              <span>Simple Transparent Pricing</span>
            </div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#F8FAFC] tracking-tight mb-4">
              Choose the Perfect Plan for <span className="text-gradient-cyan">Your Workflow</span>
            </h2>
            <p className="text-base text-text-secondary leading-relaxed font-normal">
              One-time transparent pricing with lifetime access. No hidden monthly subscriptions or surprise fees.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-[26px] p-8 flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? "bg-gradient-to-b from-[#1B2350] via-[#131A3A] to-[#0D132D] border-2 border-primary shadow-[0_0_40px_rgba(79,124,255,0.35),0_16px_48px_rgba(0,0,0,0.6)] lg:-translate-y-2"
                    : plan.isBusiness
                    ? "bg-gradient-to-b from-[#221B13] via-[#1A142A] to-[#0D132D] border border-amber-500/30 hover:border-amber-500/60 shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
                    : "bg-[#131A3A]/70 border border-white/10 hover:border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-pill bg-gradient-to-r from-primary to-secondary text-[11px] font-heading font-bold text-white shadow-[0_0_16px_rgba(79,124,255,0.8)] flex items-center gap-1.5">
                    <Sparkles size={12} className="text-accent" />
                    <span>{plan.badge}</span>
                  </div>
                )}

                {plan.isBusiness && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-pill bg-gradient-to-r from-amber-500 to-amber-600 text-[11px] font-heading font-bold text-white shadow-[0_0_16px_rgba(245,158,11,0.6)] flex items-center gap-1.5">
                    <Building2 size={12} className="text-amber-100" />
                    <span>{plan.badge}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-heading font-bold text-white">{plan.name}</h3>
                    {!plan.popular && !plan.isBusiness && (
                      <span className="px-2.5 py-0.5 rounded-pill bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-text-secondary">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="font-heading font-black text-4xl sm:text-5xl text-white">{plan.price}</span>
                    <span className="text-xs text-text-secondary font-medium">/{plan.period}</span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed mb-6 pb-6 border-b border-white/[0.08]">
                    {plan.description}
                  </p>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2.5 text-xs text-text-primary">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            plan.isBusiness
                              ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                              : "bg-status-success/20 border border-status-success/40 text-status-success"
                          }`}
                        >
                          <Check size={10} strokeWidth={3} />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPlanLoading || isProcessingClick}
                  onClick={() => handlePlanClick(plan.id)}
                  className={`relative z-10 w-full py-3.5 rounded-btn text-sm font-heading font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    plan.isCurrent
                      ? "bg-white/[0.1] text-white border border-accent/40 shadow-[0_0_16px_rgba(34,211,238,0.25)]"
                      : plan.popular
                      ? "bg-gradient-to-r from-primary to-secondary text-white shadow-[0_0_24px_rgba(79,124,255,0.6)] hover:shadow-[0_0_36px_rgba(79,124,255,0.9)] hover:-translate-y-0.5 active:translate-y-0"
                      : plan.isBusiness
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-[0_0_24px_rgba(245,158,11,0.5)] hover:shadow-[0_0_36px_rgba(245,158,11,0.8)] hover:-translate-y-0.5 active:translate-y-0"
                      : "bg-white/[0.08] hover:bg-white/15 text-white border border-white/15 hover:border-primary/40 active:scale-[0.98]"
                  }`}
                >
                  {isPlanLoading ? "Loading..." : plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upgrade Modal with dynamic plan selection */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        initialPlan={modalPlan}
      />
    </>
  );
};
