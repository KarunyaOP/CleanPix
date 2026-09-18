"use client";

import React, { useState, useEffect } from "react";
import { X, Building2, Mail, Send, CheckCircle2 } from "lucide-react";

interface EnterpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnterpriseModal: React.FC<EnterpriseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teamSize, setTeamSize] = useState("10-50");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);

    // Also trigger mailto in background for seamless client-to-sales communication
    const subject = encodeURIComponent(`CleanPix Enterprise Plan Inquiry - ${name || "Client"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTeam Size: ${teamSize}\n\nMessage:\n${message || "We are interested in high-volume CleanPix enterprise licensing."}`
    );
    window.location.href = `mailto:enterprise@cleanpix.app?subject=${subject}&body=${body}`;
  };

  const handleDirectEmail = () => {
    window.location.href =
      "mailto:enterprise@cleanpix.app?subject=CleanPix%20Enterprise%20Plan%20Inquiry&body=Hello%20CleanPix%20Team%2C%0A%0AWe%20would%20like%20to%20discuss%20an%20enterprise%20licensing%20package%20for%20our%20team.";
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#05060F]/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Contact CleanPix Enterprise Sales"
    >
      <div
        className="relative w-full max-w-[540px] rounded-[28px] bg-[#131A3A]/95 border border-primary/40 shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(79,124,255,0.3)] overflow-hidden flex flex-col p-6 sm:p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/15 rounded-full blur-[70px] pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {isSubmitted ? (
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-status-success/20 border border-status-success/40 flex items-center justify-center text-status-success shadow-[0_0_24px_rgba(34,197,94,0.4)]">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="font-heading font-extrabold text-2xl text-white">
              Inquiry Sent!
            </h3>
            <p className="text-sm text-text-secondary max-w-sm leading-relaxed">
              Thank you for your interest in CleanPix Enterprise. Our solutions team will review your requirements and reach out within 24 hours.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-6 py-2.5 rounded-btn bg-primary/30 hover:bg-primary/50 border border-primary/40 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Back to Pricing
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                <Building2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-extrabold text-xl text-white tracking-tight">
                    Contact Enterprise
                  </h3>
                  <span className="px-2 py-0.5 rounded-pill bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300">
                    BUSINESS SLA
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  High-volume API quotas, dedicated infrastructure, and team billing
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-[12px] bg-[#0A0B1E]/80 border border-white/15 focus:border-accent text-xs text-white placeholder:text-text-muted focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-[12px] bg-[#0A0B1E]/80 border border-white/15 focus:border-accent text-xs text-white placeholder:text-text-muted focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Team Size / Monthly Images
                </label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-[12px] bg-[#0A0B1E]/80 border border-white/15 focus:border-accent text-xs text-white focus:outline-none transition-colors"
                >
                  <option value="1-10">1 - 10 members (&lt; 5,000 images/mo)</option>
                  <option value="10-50">10 - 50 members (5,000 - 50,000 images/mo)</option>
                  <option value="50+">50+ members (50,000+ images/mo &amp; API)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  Inquiry Details / Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your team's workflow and volume requirements..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-[12px] bg-[#0A0B1E]/80 border border-white/15 focus:border-accent text-xs text-white placeholder:text-text-muted focus:outline-none resize-none transition-colors"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-btn font-heading font-bold text-xs text-white bg-gradient-to-r from-primary to-secondary shadow-[0_0_20px_rgba(79,124,255,0.5)] hover:shadow-[0_0_30px_rgba(79,124,255,0.75)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Submit Enterprise Inquiry</span>
                </button>

                <button
                  type="button"
                  onClick={handleDirectEmail}
                  className="py-3 px-4 rounded-btn font-heading font-bold text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  title="Direct email link"
                >
                  <Mail size={13} />
                  <span>Email Directly</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
