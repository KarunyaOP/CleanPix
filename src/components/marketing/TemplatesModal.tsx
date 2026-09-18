"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  Sparkles,
  ShoppingBag,
  User,
  Instagram,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (templateName: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "product", label: "Product Photography" },
    { id: "headshot", label: "LinkedIn Headshots" },
    { id: "ecommerce", label: "E-Commerce White" },
    { id: "social", label: "Social Media" },
  ];

  const templates = [
    {
      id: "prod-studio",
      category: "product",
      title: "Studio Softbox",
      aspect: "1:1 Square",
      description: "Soft ambient diffused studio lighting with neutral floor contact shadow.",
      gradient: "from-[#1E293B] to-[#0F172A]",
      badge: "High Conversion",
      status: "Available in Editor",
    },
    {
      id: "prod-luxury",
      category: "product",
      title: "Dark Luxury Podium",
      aspect: "4:5 Portrait",
      description: "Obsidian marble podium with subtle electric cyan rim reflections.",
      gradient: "from-[#0F172A] via-[#1E1B4B] to-[#020617]",
      badge: "Premium SaaS",
      status: "Coming Soon",
    },
    {
      id: "head-slate",
      category: "headshot",
      title: "Executive Slate",
      aspect: "1:1 Avatar",
      description: "Clean modern charcoal slate bokeh for polished executive resumes.",
      gradient: "from-[#334155] to-[#1E293B]",
      badge: "LinkedIn Top Pick",
      status: "Available in Editor",
    },
    {
      id: "head-bokeh",
      category: "headshot",
      title: "Modern Office Bokeh",
      aspect: "4:5 Portrait",
      description: "Sunlit architectural interior blur highlighting subject face contours.",
      gradient: "from-[#1E3A8A]/60 via-[#172554] to-[#0B1120]",
      badge: "Creator Favorite",
      status: "Coming Soon",
    },
    {
      id: "ecom-white",
      category: "ecommerce",
      title: "Pure White 1:1",
      aspect: "1:1 Amazon Standard",
      description: "100% RGB(255,255,255) compliant white background for marketplace listings.",
      gradient: "from-[#FFFFFF] to-[#F1F5F9]",
      textDark: true,
      badge: "Amazon / Shopify",
      status: "Available in Editor",
    },
    {
      id: "ecom-catalog",
      category: "ecommerce",
      title: "Clean Catalog Shadow",
      aspect: "4:3 Standard",
      description: "High-contrast clean isolation with realistic floating drop shadows.",
      gradient: "from-[#E2E8F0] to-[#CBD5E1]",
      textDark: true,
      badge: "Etsy / eBay",
      status: "Coming Soon",
    },
    {
      id: "soc-neon",
      category: "social",
      title: "Cyberpunk Glow",
      aspect: "9:16 Vertical Story",
      description: "Vibrant dual cyan & violet neon rim outlines with radial ambient flares.",
      gradient: "from-[#00F0FF]/30 via-[#8B5CF6]/30 to-[#0A0B1E]",
      badge: "TikTok & Reels",
      status: "Available in Editor",
    },
    {
      id: "soc-thumb",
      category: "social",
      title: "YouTube High Contrast",
      aspect: "16:9 Thumbnail",
      description: "Punchy bold saturated backdrop designed to maximize click-through rate.",
      gradient: "from-[#4F7CFF]/40 to-[#D946EF]/30",
      badge: "YouTube 1080p",
      status: "Coming Soon",
    },
  ];

  const filteredTemplates =
    activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#05060F]/85 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="CleanPix Template Gallery"
    >
      <div
        className="relative w-full max-w-[880px] max-h-[90vh] rounded-[28px] bg-[#131A3A]/95 border border-primary/40 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(79,124,255,0.25)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#0A0B1E]/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-accent shadow-[0_0_12px_rgba(34,211,238,0.4)]">
              <Layers size={14} className="text-accent" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">
                Explore Templates & Studio Presets
              </h3>
              <p className="text-xs text-text-secondary">
                Pre-configured studio backdrops, lighting, and aspect ratios
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Pills Navigation */}
        <div className="px-6 py-3 border-b border-white/[0.08] bg-[#0E142A]/70 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-pill text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-primary to-secondary text-white shadow-[0_0_12px_rgba(79,124,255,0.6)]"
                    : "text-text-secondary hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/8"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Templates Grid Content (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[60vh] space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredTemplates.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-[20px] bg-[#0A0B1E]/90 border border-white/12 hover:border-primary/50 p-3.5 flex flex-col justify-between gap-3 shadow-md hover:shadow-[0_0_24px_rgba(79,124,255,0.25)] transition-all duration-200"
              >
                {/* Visual Swatch / Preview Banner */}
                <div
                  className={`w-full aspect-[4/3] rounded-[14px] bg-gradient-to-br ${item.gradient} border border-white/15 relative overflow-hidden flex items-center justify-center p-3 shadow-inner`}
                >
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-200">
                    <Sparkles size={20} className="text-accent" />
                  </div>

                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-pill bg-[#0A0B1E]/80 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white">
                    {item.aspect}
                  </span>
                </div>

                {/* Template Info */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                    <span className="text-[10px] font-semibold text-accent shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Bottom Status / Use Action */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded-pill font-bold ${
                      item.status === "Available in Editor"
                        ? "bg-status-success/20 text-status-success border border-status-success/30"
                        : "bg-white/[0.06] text-text-muted border border-white/10"
                    }`}
                  >
                    {item.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSelectTemplate) onSelectTemplate(item.title);
                    }}
                    className="font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Use</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#0A0B1E]/60 flex items-center justify-between text-xs text-text-muted shrink-0">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-accent" />
            <span>Templates are automatically centered with lossless 4K export presets</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-pill bg-white/[0.05] hover:bg-white/10 border border-white/10 font-semibold text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
