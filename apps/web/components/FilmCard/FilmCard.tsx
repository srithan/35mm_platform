"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Film } from "lucide-react";
import { TMDB_IMAGE_BASE, TMDB_POSTER_SIZE } from "@/lib/tmdb/constants";
import { cn } from "@/lib/utils/cn";

export interface FilmCardProps {
  title: string;
  year: number;
  genre?: string;
  posterUrl?: string;
  /** Stored as 1–10 int; displayed as half-stars (÷2 → 0.5–5.0). */
  rating?: number;
  onClick?: () => void;
  className?: string;
}

const CARD_BG = "#0d0806";
const TITLE_COLOR = "#faf9f7";
// Brighter star colors — the dark card needs more contrast
const STAR_FILLED = "#e8735a";
const STAR_EMPTY = "rgba(232, 115, 90, 0.25)";

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const FALLBACK_GLOW = [
  "radial-gradient(ellipse at 0% 60%, rgba(120, 50, 35, 0.55) 0%, transparent 65%)",
  "radial-gradient(ellipse at 40% 90%, rgba(120, 50, 35, 0.30) 0%, transparent 50%)",
].join(", ");

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function resolvePosterUrl(posterUrl?: string): string | undefined {
  if (!posterUrl) return undefined;

  let absolute: string;
  if (posterUrl.startsWith("http://") || posterUrl.startsWith("https://")) {
    absolute = posterUrl;
  } else if (posterUrl.startsWith("/")) {
    absolute = `${TMDB_IMAGE_BASE}/${TMDB_POSTER_SIZE}${posterUrl}`;
  } else {
    absolute = posterUrl;
  }

  return `${API_BASE}/poster-proxy?url=${encodeURIComponent(absolute)}`;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function extractDominantColor(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const W = img.naturalWidth;
  const H = img.naturalHeight;
  canvas.width = W;
  canvas.height = H;

  try {
    ctx.drawImage(img, 0, 0);

    const grid = 16;
    const stepX = Math.max(1, Math.floor(W / grid));
    const stepY = Math.max(1, Math.floor(H / grid));

    const candidates: Array<{ r: number; g: number; b: number; sat: number }> = [];

    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const px = Math.min(x * stepX, W - 1);
        const py = Math.min(y * stepY, H - 1);
        const d = ctx.getImageData(px, py, 1, 1).data;
        const r = d[0], g = d[1], b = d[2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        candidates.push({ r, g, b, sat });
      }
    }

    // Average the top 25% most saturated pixels
    candidates.sort((a, b) => b.sat - a.sat);
    const topN = Math.max(1, Math.floor(candidates.length * 0.25));
    const top = candidates.slice(0, topN);

    let rSum = 0, gSum = 0, bSum = 0;
    for (const p of top) { rSum += p.r; gSum += p.g; bSum += p.b; }

    const r = Math.round(rSum / top.length);
    const g = Math.round(gSum / top.length);
    const b = Math.round(bSum / top.length);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const finalSat = max === 0 ? 0 : (max - min) / max;

    let finalR = r, finalG = g, finalB = b;
    if (finalSat < 0.2) {
      const avg = (r + g + b) / 3;
      const boost = 2.5;
      finalR = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * boost)));
      finalG = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * boost)));
      finalB = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * boost)));
    }

    const rgb = `${finalR}, ${finalG}, ${finalB}`;
    console.log("[FilmCard] extracted rgb:", rgb, "sat:", finalSat.toFixed(2));
    return rgb;
  } catch (err) {
    console.error("[FilmCard] canvas extraction failed:", err);
    return null;
  }
}

function buildGlowBackground(rgb: string | null): string {
  if (!rgb) return FALLBACK_GLOW;

  const [r, g, b] = rgb.split(",").map(Number);
  const lum = luminance(r, g, b);

  let fr = r, fg = g, fb = b;
  if (lum < 80) {
    const factor = Math.min(3.5, 80 / Math.max(lum, 1));
    fr = Math.min(255, Math.round(r * factor));
    fg = Math.min(255, Math.round(g * factor));
    fb = Math.min(255, Math.round(b * factor));
  }

  return [
    `radial-gradient(ellipse at 0% 60%, rgba(${fr}, ${fg}, ${fb}, 0.55) 0%, transparent 65%)`,
    `radial-gradient(ellipse at 40% 90%, rgba(${fr}, ${fg}, ${fb}, 0.30) 0%, transparent 50%)`,
  ].join(", ");
}

function FilmCardStarRow({ ratingInt }: { ratingInt: number }) {
  const stars = ratingInt / 2;
  return (
    <div className="mt-2.5 flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => {
        const val = stars - i;
        if (val >= 1) {
          return (
            <span
              key={i}
              style={{ fontSize: 14, color: STAR_FILLED, filter: "drop-shadow(0 0 4px rgba(232,115,90,0.5))" }}
            >
              ★
            </span>
          );
        }
        if (val >= 0.5) {
          return (
            <span key={i} className="relative inline-block" style={{ fontSize: 14, width: "0.72em" }}>
              <span style={{ color: STAR_EMPTY }}>★</span>
              <span
                className="absolute left-0 top-0 overflow-hidden"
                style={{ color: STAR_FILLED, width: "50%", filter: "drop-shadow(0 0 4px rgba(232,115,90,0.5))" }}
              >
                ★
              </span>
            </span>
          );
        }
        return (
          <span key={i} style={{ fontSize: 14, color: STAR_EMPTY }}>★</span>
        );
      })}
    </div>
  );
}

function PosterPlaceholder() {
  return (
    <div
      className="flex h-[90px] w-16 shrink-0 items-center justify-center rounded-[5px]"
      style={{
        background: "linear-gradient(170deg, #3d1812 0%, #1a0808 100%)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <Film size={22} strokeWidth={1.5} style={{ color: "#faf9f7", opacity: 0.3 }} />
    </div>
  );
}

export function FilmCard({
  title,
  year,
  genre,
  posterUrl,
  rating,
  onClick,
  className,
}: FilmCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenImgRef = useRef<HTMLImageElement | null>(null);

  const [dominantRgb, setDominantRgb] = useState<string | null>(null);
  const [posterSrc, setPosterSrc] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [glowReady, setGlowReady] = useState(false);

  const resolvedPosterUrl = useMemo(() => resolvePosterUrl(posterUrl), [posterUrl]);

  useEffect(() => {
    setDominantRgb(null);
    setPosterSrc(null);
    setPosterFailed(false);
    setGlowReady(false);
  }, [resolvedPosterUrl]);

  const handleLoad = useCallback(() => {
    const img = hiddenImgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rgb = extractDominantColor(img, canvas);
    setDominantRgb(rgb);
    setPosterSrc(img.src);
    window.setTimeout(() => setGlowReady(true), 16);
  }, []);

  const handleError = useCallback(() => {
    console.error("[FilmCard] poster failed to load:", resolvedPosterUrl);
    setPosterFailed(true);
    window.setTimeout(() => setGlowReady(true), 16);
  }, [resolvedPosterUrl]);

  useEffect(() => {
    if (!resolvedPosterUrl) return;
    if (!hiddenImgRef.current) hiddenImgRef.current = new Image();
    const img = hiddenImgRef.current;

    img.onload = null;
    img.onerror = null;
    img.src = "";
    img.crossOrigin = "anonymous";
    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = resolvedPosterUrl;

    return () => { img.onload = null; img.onerror = null; };
  }, [resolvedPosterUrl, handleLoad, handleError]);

  const showPoster = Boolean(posterSrc) && !posterFailed;
  const metadata = genre ? `${year} · ${genre}` : String(year);
  const glowBackground = buildGlowBackground(dominantRgb);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }
          : undefined
      }
      className={cn(
        "relative h-[130px] w-full overflow-hidden rounded-[10px]",
        onClick && "cursor-pointer",
        className
      )}
      style={{ background: CARD_BG }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute opacity-0" aria-hidden />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 transition-opacity duration-[600ms] ease-out"
        style={{ background: glowBackground, opacity: glowReady ? 1 : 0 }}
        aria-hidden
      />

      {/* Grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: GRAIN_BG, backgroundSize: "128px" }}
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-[1] flex h-full items-center gap-[18px] px-5 py-4">
        {showPoster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterSrc!}
            alt=""
            className="h-[90px] w-16 shrink-0 rounded-[5px] object-cover"
            style={{ boxShadow: "0 6px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)" }}
          />
        ) : (
          <PosterPlaceholder />
        )}

        <div className="min-w-0 flex-1">
          <div
            className="truncate font-display-discover text-[20px] leading-tight tracking-[-0.01em]"
            style={{ color: TITLE_COLOR }}
          >
            {title}
          </div>
          <div
            className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
            style={{ color: "rgba(250, 249, 247, 0.4)" }}
          >
            {metadata}
          </div>
          {rating != null && rating > 0 && <FilmCardStarRow ratingInt={rating} />}
        </div>
      </div>
    </div>
  );
}