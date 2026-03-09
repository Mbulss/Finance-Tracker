import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        surface: "#f0f9ff",
        card: "#ffffff",
        muted: "#64748b",
        border: "#bae6fd",
        primary: {
          DEFAULT: "#0ea5e9",
          hover: "#0284c7",
          light: "#e0f2fe",
        },
        income: "#059669",
        expense: "#dc2626",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.06)",
        card: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)",
        "card-hover": "0 12px 24px -8px rgba(0,0,0,0.08), 0 4px 12px -4px rgba(0,0,0,0.04)",
        sidebar: "4px 0 24px -4px rgba(0,0,0,0.06)",
        glow: "0 0 40px -8px rgba(14, 165, 233, 0.25)",
        "glow-dark": "0 0 40px -8px rgba(56, 189, 248, 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out forwards",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
        "slide-in": "slideIn 0.3s ease-out",
        "toast-in": "toastIn 0.35s ease-out forwards",
        "count-up": "countUp 0.6s ease-out forwards",
        "chat-in": "chatIn 0.2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        toastIn: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        chatIn: {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
