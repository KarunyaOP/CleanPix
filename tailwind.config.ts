import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F7CFF",
          glow: "rgba(79, 124, 255, 0.45)",
          subtle: "rgba(79, 124, 255, 0.15)",
          tint: "rgba(79, 124, 255, 0.05)",
        },
        secondary: {
          DEFAULT: "#8B5CF6",
          glow: "rgba(139, 92, 246, 0.45)",
        },
        accent: {
          DEFAULT: "#22D3EE",
          glow: "rgba(34, 211, 238, 0.35)",
        },
        background: {
          base: "#0A0B1E",
          deep: "#05060F",
        },
        surface: {
          DEFAULT: "#131A3A",
          glass: "rgba(19, 26, 58, 0.75)",
          elevated: "#1B2350",
          card: "rgba(19, 26, 58, 0.7)",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.08)",
          medium: "rgba(255, 255, 255, 0.15)",
          glow: "rgba(79, 124, 255, 0.45)",
          cyanGlow: "rgba(34, 211, 238, 0.45)",
        },
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#64748B",
        },
        status: {
          success: "#22C55E",
          warning: "#F5B301",
          proOrange: "#F97316",
        },
      },
      fontFamily: {
        heading: ["var(--font-sora)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        badge: "8px",
        chip: "10px",
        btn: "12px",
        input: "12px",
        card: "16px",
        panel: "20px",
        frame: "24px",
        modal: "24px",
        pill: "999px",
      },
      boxShadow: {
        "card-rest": "0 8px 24px rgba(0, 0, 0, 0.35)",
        "card-hover": "0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(79, 124, 255, 0.15)",
        "primary-glow": "0 0 24px rgba(79, 124, 255, 0.45)",
        "accent-glow": "0 0 32px rgba(34, 211, 238, 0.35)",
        "hero-glow": "0 0 50px rgba(79, 124, 255, 0.3), 0 0 100px rgba(139, 92, 246, 0.2)",
        "focus-ring": "0 0 0 3px rgba(79, 124, 255, 0.35)",
        "inner-glass": "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #4F7CFF 0%, #8B5CF6 100%)",
        "headline-gradient": "linear-gradient(90deg, #4F7CFF 0%, #22D3EE 100%)",
        "pro-gradient": "linear-gradient(90deg, #F5B301 0%, #F97316 100%)",
        "glass-gradient": "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
      },
      animation: {
        "float-slow": "float 5s ease-in-out infinite",
        "float-reverse": "floatReverse 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "blob-drift": "blobDrift 16s ease-in-out infinite alternate",
        "blob-drift-delayed": "blobDriftDelayed 18s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        floatReverse: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(6px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        blobDrift: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(20px, -20px) scale(1.05)" },
          "100%": { transform: "translate(-15px, 15px) scale(0.98)" },
        },
        blobDriftDelayed: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-25px, 20px) scale(1.06)" },
          "100%": { transform: "translate(15px, -15px) scale(0.95)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
