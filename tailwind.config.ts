import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      colors: {
        appBg: "#0d0b09",
        cardBg: "#131109",
        line: "#28241c",
        accent: "#c9a84c",
        good: "#4ade80",
        okay: "#fb923c",
        bad: "#f87171"
      }
    }
  },
  plugins: []
};

export default config;
