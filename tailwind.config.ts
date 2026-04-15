import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        appBg: "#09090b",
        cardBg: "#121316",
        line: "#2a2d35",
        accent: "#7dd3fc",
        good: "#34d399",
        okay: "#fbbf24",
        bad: "#f87171"
      }
    }
  },
  plugins: []
};

export default config;
