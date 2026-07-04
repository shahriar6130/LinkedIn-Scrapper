import type { Config } from "tailwindcss";

export default {
  content: ["src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f0fe",
          100: "#d2e3fc",
          500: "#0a66c2",
          600: "#004182",
          700: "#003366",
        },
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f8fafc",
          tertiary: "#f1f5f9",
        },
        text: {
          DEFAULT: "#0f172a",
          secondary: "#64748b",
          tertiary: "#94a3b8",
        },
        border: {
          DEFAULT: "#e5e7eb",
          light: "#f1f5f9",
        },
        success: "#059669",
        error: "#dc2626",
        warning: "#d97706",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
        xs: ["11px", { lineHeight: "16px" }],
        sm: ["12px", { lineHeight: "16px" }],
        base: ["13px", { lineHeight: "20px" }],
        lg: ["14px", { lineHeight: "20px" }],
        xl: ["16px", { lineHeight: "24px" }],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        pill: "99px",
      },
      boxShadow: {
        sidebar:
          "-4px 0 24px rgba(0,0,0,0.08), -1px 0 4px rgba(0,0,0,0.04)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
        "card-hover":
          "0 2px 6px rgba(0,0,0,0.06), 0 8px 20px rgba(0,0,0,0.08)",
        launcher:
          "0 4px 12px rgba(10,102,194,0.25), 0 2px 4px rgba(0,0,0,0.1)",
      },
      keyframes: {
        shimmer: {
          "0%": { opacity: "0.5" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.5" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
