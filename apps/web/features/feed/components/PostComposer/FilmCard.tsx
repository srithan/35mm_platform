"use client";

import Image from "next/image";
import type { FilmResult } from "./types";
import { cn } from "@/lib/utils/cn";
import { TMDB_IMAGE_BASE, TMDB_POSTER_SIZE } from "@/lib/tmdb/constants";
import { Icon } from "@/components/Icon/Icon";
import { StarRatingInput } from "./StarRatingInput";

interface FilmCardProps {
  film: FilmResult;
  starRating: number;
  isRewatch: boolean;
  onStarChange: (rating: number) => void;
  onRewatchChange: (value: boolean) => void;
  onClear: () => void;
}

export function FilmCard({
  film,
  starRating,
  isRewatch,
  onStarChange,
  onRewatchChange,
  onClear,
}: FilmCardProps) {
  const posterSrc = film.posterPath
    ? film.posterPath.startsWith("http")
      ? film.posterPath
      : `${TMDB_IMAGE_BASE}/${TMDB_POSTER_SIZE}${film.posterPath}`
    : null;

  return (
    <div className="mb-3 overflow-hidden rounded-[6px] border border-[var(--composer-border)] bg-[var(--composer-field-bg)] shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <div className="grid grid-cols-[68px_minmax(0,1fr)_44px] items-stretch">
        <div
          className="relative aspect-[2/3] w-[68px] flex-shrink-0 overflow-hidden bg-sunken"
          style={{
            background: "linear-gradient(to bottom, #0f0f0f, #2a2a2a)",
          }}
        >
          {posterSrc ? (
            <Image
              src={posterSrc}
              alt={`${film.title} poster`}
              width={136}
              height={204}
              sizes="68px"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="frames" className="text-white/15 w-4 h-4" strokeWidth={1.2} />
            </div>
          )}
        </div>
        <div className="min-w-0 p-3">
          <div className="truncate text-[14px] font-medium leading-snug text-fg" title={film.title}>
            {film.title}
          </div>
          <div className="text-[11.5px] text-fg-muted mt-0.5">
            {film.language}
            {film.genres.length > 0 ? ` · ${film.genres.slice(0, 2).join(", ")}` : ""}
            {film.year ? ` · ${film.year}` : ""}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-2">
            <StarRatingInput value={starRating} onChange={onStarChange} />
            <label className="flex min-h-11 items-center gap-1.5 cursor-pointer">
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide uppercase transition-colors",
                  isRewatch ? "text-fg" : "text-fg-muted"
                )}
              >
                Rewatch
              </span>
              <div className="relative w-8 h-4">
                <input
                  type="checkbox"
                  checked={isRewatch}
                  onChange={(e) => onRewatchChange(e.target.checked)}
                  className="peer sr-only"
                />
                <div
                  className={cn(
                    "absolute inset-0 rounded-full transition-colors duration-200 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg",
                    isRewatch ? "bg-fg" : "bg-[var(--switch-track-off)] border border-[var(--switch-track-off-border)]"
                  )}
                />
                <div
                  className={cn(
                    "absolute top-0.5 left-0.5 w-3 h-3 rounded-full shadow transition-transform duration-200",
                    isRewatch ? "translate-x-4 bg-[var(--composer-bg)]" : "bg-[var(--switch-thumb-off)]"
                  )}
                />
              </div>
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="m-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg text-fg-muted shadow-sm transition-colors hover:border-fg/30 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
          aria-label="Remove film"
        >
          <Icon name="x" className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
