import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#07080a",
          900: "#0b0d10",
          850: "#101318",
          800: "#15181e",
          700: "#1d2128",
          600: "#272c35",
          500: "#363c47",
        },
        silver: {
          100: "#f2f4f7",
          200: "#dfe3ea",
          300: "#c2c8d2",
          400: "#9aa2ae",
          500: "#737b88",
        },
        electric: {
          300: "#7cc4ff",
          400: "#38a8ff",
          500: "#0a84ff",
          600: "#0a6fe0",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 18px 40px -24px rgba(0,0,0,0.9)",
        accent: "0 0 0 1px rgba(56,168,255,0.35), 0 12px 30px -18px rgba(10,132,255,0.75)",
      },
      backgroundImage: {
        "graphite-sheen":
          "linear-gradient(160deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0) 42%), radial-gradient(120% 80% at 10% 0%, rgba(10,132,255,0.10) 0%, rgba(0,0,0,0) 55%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(10,132,255,0.45)" },
          "70%": { boxShadow: "0 0 0 10px rgba(10,132,255,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(10,132,255,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
        "rise-in": "rise-in 260ms cubic-bezier(0.22,1,0.36,1) both",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;