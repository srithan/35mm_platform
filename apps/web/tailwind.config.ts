import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", "[data-theme=\"dark\"]"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Neutral scale ── */
        neutral: {
          50: "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          400: "var(--neutral-400)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)",
        },
        /* ── Semantic aliases ── */
        bg: "var(--bg)",
        fg: {
          DEFAULT: "var(--fg)",
          "2": "var(--fg-2)",
          light: "var(--fg-light)",
          muted: "var(--fg-muted)",
          faint: "var(--fg-faint)",
        },
        accent: "var(--accent)",
        elevated: "var(--elevated)",
        sunken: {
          DEFAULT: "var(--sunken)",
          "2": "var(--sunken-2)",
        },
        border: "var(--color-border)",
        "border-strong": "var(--color-border-strong)",
        /* ── Semantic tokens ── */
        skeleton: {
          DEFAULT: "var(--color-skeleton)",
          strong: "var(--color-skeleton-strong)",
        },
        hover: "var(--color-bg-hover)",
        active: "var(--color-bg-active)",
        "text-secondary": "var(--color-text-secondary)",
        "text-tertiary": "var(--color-text-tertiary)",
        /* ── Action feedback ── */
        like: "var(--color-like)",
        repost: "var(--color-repost)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        /* ── Domain: Film ── */
        "film-red": "var(--color-film-red)",
        "film-gold": {
          DEFAULT: "var(--color-film-gold)",
          hover: "var(--color-film-gold-hover)",
        },
        "poster-bg-from": "var(--color-poster-bg-from)",
        "poster-bg-to": "var(--color-poster-bg-to)",
        "poster-stroke": "var(--color-poster-stroke)",
        /* ── Domain: Paper (unchanged value, now from var) ── */
        paper: {
          DEFAULT: "var(--color-bg-sunken)",
          "2": "var(--color-bg-sunken)",
          "3": "var(--color-bg-sunken-2)",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "serif"],
        "display-discover": ["var(--font-display-discover)", "serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Helvetica Neue"',
          'var(--font-sans, "DM Sans")',
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        commentsPanelIn: {
          from: { opacity: "0", transform: "translateX(12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        videoFadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        videoSlideUp: {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(var(--video-slide-amount, -100%))" },
        },
        videoSlideDown: {
          from: { transform: "translateY(var(--video-slide-amount, -100%))" },
          to: { transform: "translateY(0)" },
        },
        skeletonShimmer: {
          "0%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.35s ease both",
        "slide-in-right": "slideInRight 250ms ease both",
        "comments-panel-in": "commentsPanelIn 220ms ease both",
        "video-fade-in": "videoFadeIn 180ms ease both",
        "video-slide-up": "videoSlideUp 280ms ease both",
        "video-slide-down": "videoSlideDown 280ms ease both",
        "skeleton-shimmer": "skeletonShimmer 1.6s ease-in-out infinite",
      },
      backgroundSize: {
        "skeleton-shimmer": "200% 100%",
      },
    },
  },
  plugins: [],
};

export default config;
