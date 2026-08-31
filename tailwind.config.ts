import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: "#F8F6F2",
        "warm-white": "#FAF8F5",
        beige: "#EFECE6",
        "soft-gold": "#D4AF37",
        "gold-hover": "#C5A059",
        champagne: "#F7E7CE",
        "olive-accent": "#6B705C",
        "olive-dark": "#4A503D",
        charcoal: "#1A1C1B",
        navy: "#00061F",
        "navy-light": "#081D4A",
        glass: "rgba(255, 255, 255, 0.75)",
        "glass-border": "rgba(255, 255, 255, 0.9)",
        stroke: "rgba(212, 175, 55, 0.2)",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "var(--font-cormorant)", "serif"],
        garamond: ["var(--font-cormorant)", "serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        tech: ["var(--font-space-grotesk)", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        luxury: "0 20px 40px -15px rgba(0, 6, 31, 0.07)",
        "luxury-hover": "0 25px 50px -12px rgba(212, 175, 55, 0.15)",
        glass: "0 8px 32px 0 rgba(0, 6, 31, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
