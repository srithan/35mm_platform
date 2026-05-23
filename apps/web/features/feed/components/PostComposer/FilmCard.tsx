"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { FilmResult } from "./types";
import { cn } from "@/lib/utils/cn";
import { TMDB_IMAGE_BASE, TMDB_POSTER_SIZE } from "@/lib/tmdb/constants";
import { Icon } from "@/components/Icon/Icon";

interface FilmCardProps {
  film: FilmResult;
  starRating: number;
  isRewatch: boolean;
  onStarChange: (rating: number) => void;
  onRewatchChange: (value: boolean) => void;
  onClear: () => void;
}

const StarIcon = ({
  filled,
  isHoverPreview,
  onHover,
  onClick,
}: {
  filled: boolean;
  isHoverPreview?: boolean;
  onHover?: () => void;
  onClick?: () => void;
}) => (
  <Icon
    name="star"
    className={cn(
      "w-5 h-5 transition-all duration-150 cursor-pointer",
      filled
        ? (isHoverPreview ? "text-[#c8952a]" : "text-film-gold")
        : "text-border"
    )}
    fill="currentColor"
    strokeWidth={0}
    onMouseEnter={onHover}
    onClick={onClick}
  />
);

export function FilmCard({
  film,
  starRating,
  isRewatch,
  onStarChange,
  onRewatchChange,
  onClear,
}: FilmCardProps) {
  const [hoverStar, setHoverStar] = useState<number | null>(null);
  const displayStars = hoverStar ?? starRating;
  const posterSrc = film.posterPath
    ? film.posterPath.startsWith("http")
      ? film.posterPath
      : `${TMDB_IMAGE_BASE}/${TMDB_POSTER_SIZE}${film.posterPath}`
    : null;

  return (
    <div className="border border-border rounded-[6px] overflow-hidden bg-elevated mb-3">
      <div className="flex items-stretch">
        <div
          className="self-stretch aspect-[2/3] flex-shrink-0 overflow-hidden"
          style={{
            background: "linear-gradient(to bottom, #0f0f0f, #2a2a2a)",
          }}
        >
          {posterSrc ? (
            <Image
              src={posterSrc}
              alt={`${film.title} poster`}
              width={56}
              height={84}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon name="frames" className="text-white/15 w-4 h-4" strokeWidth={1.2} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 p-3">
          <div className="text-[14px] text-fg leading-snug">
            {film.title}
          </div>
          <div className="text-[11.5px] text-fg-muted mt-0.5">
            {film.language}
            {film.genres.length > 0 ? ` · ${film.genres.slice(0, 2).join(", ")}` : ""}
            {film.year ? ` · ${film.year}` : ""}
          </div>
          <div className="flex items-center justify-between gap-3 mt-2">
            <div
              className="flex items-center gap-1"
              onMouseLeave={() => setHoverStar(null)}
            >
              <span className="text-[10px] text-fg-faint mr-1 font-medium tracking-wide uppercase">
                Rate
              </span>
              {[1, 2, 3, 4, 5].map((n) => (
                <StarIcon
                  key={n}
                  filled={n <= displayStars}
                  isHoverPreview={hoverStar !== null}
                  onHover={() => setHoverStar(n)}
                  onClick={() => onStarChange(n)}
                />
              ))}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide uppercase transition-colors",
                  isRewatch ? "text-fg" : "text-fg-faint"
                )}
              >
                Rewatch
              </span>
              <div className="relative w-8 h-4">
                <input
                  type="checkbox"
                  checked={isRewatch}
                  onChange={(e) => onRewatchChange(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "absolute inset-0 rounded-full transition-colors duration-200",
                    isRewatch ? "bg-fg" : "bg-sunken-2"
                  )}
                />
                <div
                  className={cn(
                    "absolute top-0.5 left-0.5 w-3 h-3 bg-elevated rounded-full shadow transition-transform duration-200",
                    isRewatch && "translate-x-4"
                  )}
                />
              </div>
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="self-start mt-2 mr-2 p-1.5 text-fg-faint hover:text-fg transition-colors rounded"
          aria-label="Remove film"
        >
          <Icon name="x" className="w-[11px] h-[11px]" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
