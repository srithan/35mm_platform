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
const STAR_FILLED = "#c2473a";
const STAR_EMPTY = "rgba(194, 71, 58, 0.2)";

const GRAIN_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const FALLBACK_GLOW = [
  "radial-gradient(ellipse at 0% 50%, rgba(120, 50, 35, 0.3) 0%, transparent 60%)",
  "radial-gradient(ellipse at 30% 80%, rgba(120, 50, 35, 0.15) 0%, transparent 45%)",
].join(", ");

function resolvePosterUrl(posterUrl?: string): string | undefined {
  if (!posterUrl) return undefined;
  if (posterUrl.startsWith("http://") || posterUrl.startsWith("https://")) return posterUrl;
  if (posterUrl.startsWith("/")) {
    return `${TMDB_IMAGE_BASE}/${TMDB_POSTER_SIZE}${posterUrl}`;
  }
  return posterUrl;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function extractPosterDominantColor(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement
): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const sampleW = Math.max(1, Math.floor(img.naturalWidth / 3));
  const sampleH = img.naturalHeight;
  canvas.width = sampleW;
  canvas.height = sampleH;

  try {
    ctx.drawImage(img, 0, 0, sampleW, sampleH, 0, 0, sampleW, sampleH);
  } catch {
    return null;
  }

  const grid = 10;
  const stepX = Math.max(1, Math.floor(sampleW / grid));
  const stepY = Math.max(1, Math.floor(sampleH / grid));
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  try {
    for (let y = 0; y < grid; y += 1) {
      for (let x = 0; x < grid; x += 1) {
        const px = Math.min(x * stepX, sampleW - 1);
        const py = Math.min(y * stepY, sampleH - 1);
        const data = ctx.getImageData(px, py, 1, 1).data;
        const r = data[0];
        const g = data[1];
        const b = data[2];
        const lum = luminance(r, g, b);
        if (lum < 30 || lum > 220) continue;
        rSum += r;
        gSum += g;
        bSum += b;
        count += 1;
      }
    }
  } catch {
    return null;
  }

  if (count === 0) return null;

  return [
    Math.round(rSum / count),
    Math.round(gSum / count),
    Math.round(bSum / count),
  ].join(", ");
}

function buildGlowBackground(rgb: string | null, useFallback: boolean): string {
  if (useFallback || !rgb) return FALLBACK_GLOW;
  return [
    `radial-gradient(ellipse at 0% 50%, rgba(${rgb}, 0.30) 0%, transparent 60%)`,
    `radial-gradient(ellipse at 30% 80%, rgba(${rgb}, 0.15) 0%, transparent 45%)`,
  ].join(", ");
}

function FilmCardStarRow({ ratingInt }: { ratingInt: number }) {
  const stars = ratingInt / 2;

  return (
    <div className="mt-2 flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, function (_, i) {
        const starValue = stars - i;
        if (starValue >= 1) {
          return (
            <span key={i} className="leading-none" style={{ fontSize: 13, color: STAR_FILLED }}>
              ★
            </span>
          );
        }
        if (starValue >= 0.5) {
          return (
            <span key={i} className="relative inline-block leading-none" style={{ fontSize: 13, width: "0.72em" }}>
              <span style={{ color: STAR_EMPTY }}>★</span>
              <span
                className="absolute left-0 top-0 overflow-hidden"
                style={{ color: STAR_FILLED, width: "50%" }}
              >
                ★
              </span>
            </span>
          );
        }
        return (
          <span key={i} className="leading-none" style={{ fontSize: 13, color: STAR_EMPTY }}>
            ★
          </span>
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
      <Film size={22} strokeWidth={1.5} className="text-[#faf9f7] opacity-30" />
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
  const posterRef = useRef<HTMLImageElement>(null);
  const [dominantRgb, setDominantRgb] = useState<string | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [glowReady, setGlowReady] = useState(false);
  const resolvedPosterUrl = useMemo(function () {
    return resolvePosterUrl(posterUrl);
  }, [posterUrl]);

  const showPosterImage = Boolean(resolvedPosterUrl) && !posterFailed;
  const useFallbackGlow = dominantRgb == null;

  useEffect(function () {
    setPosterFailed(false);
    setDominantRgb(null);
  }, [posterUrl]);

  const handlePosterLoad = useCallback(function () {
    const img = posterRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    setPosterFailed(false);
    const rgb = extractPosterDominantColor(img, canvas);
    if (rgb) setDominantRgb(rgb);
  }, []);

  const handlePosterError = useCallback(function () {
    setPosterFailed(true);
    setDominantRgb(null);
  }, []);

  useEffect(function () {
    const img = posterRef.current;
    if (!img || !resolvedPosterUrl) return;
    if (img.complete && img.naturalWidth > 0) {
      handlePosterLoad();
    }
  }, [resolvedPosterUrl, handlePosterLoad]);

  useEffect(function () {
    const timer = window.setTimeout(function () {
      setGlowReady(true);
    }, 16);
    return function () {
      window.clearTimeout(timer);
    };
  }, []);

  const metadata = genre ? `${year} · ${genre}` : String(year);
  const glowBackground = buildGlowBackground(dominantRgb, useFallbackGlow);

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? function (event) {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative h-[130px] w-full overflow-hidden rounded-[10px]",
        onClick && "cursor-pointer",
        className
      )}
      style={{ background: CARD_BG }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute opacity-0"
        aria-hidden
      />

      <div
        className="absolute inset-0 transition-opacity duration-[600ms] ease-out"
        style={{
          background: glowBackground,
          opacity: glowReady ? 1 : 0,
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: GRAIN_BG,
          backgroundSize: "128px",
        }}
        aria-hidden
      />

      <div className="relative z-[1] flex h-full items-center gap-[18px] px-5 py-4">
        {showPosterImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={posterRef}
            src={resolvedPosterUrl}
            alt=""
            className="h-[90px] w-16 shrink-0 rounded-[5px] object-cover"
            style={{
              boxShadow: "0 6px 20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
            onLoad={handlePosterLoad}
            onError={handlePosterError}
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
          {rating != null && rating > 0 ? <FilmCardStarRow ratingInt={rating} /> : null}
        </div>
      </div>
    </div>
  );
}
