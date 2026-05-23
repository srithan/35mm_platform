"use client";

import { useState } from "react";
import { FilmPoster } from "@/components/FilmPoster";
import { cn } from "@/lib/utils/cn";

interface FeaturedFilmRowProps {
  film: {
    title: string;
    tagline: string;
    rating: number;
    ratingCount: string;
    tags: string[];
    stats: { thisWeek: string; reviews: string };
    poster: string;
    imdbId?: string;
    posterFallbackBg?: string;
  };
  primaryAction?: "watched" | "add-watched";
  onOpenModal?: () => void;
}

function Star({ filled, half }: { filled?: boolean; half?: boolean }) {
  return (
    <div
      className="w-2.5 h-2.5 shrink-0"
      style={{
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
        background: half
          ? "linear-gradient(90deg, var(--accent) 50%, var(--border) 50%)"
          : filled
            ? "var(--accent)"
            : "var(--border)",
      }}
    />
  );
}

export function FeaturedFilmRow({
  film,
  primaryAction = "watched",
  onOpenModal,
}: FeaturedFilmRowProps) {
  const [watched, setWatched] = useState(primaryAction === "watched");
  const [watchlisted, setWatchlisted] = useState(false);
  const fullStars = Math.floor(film.rating);
  const hasHalf = film.rating % 1 >= 0.5;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenModal}
      onKeyDown={(e) => e.key === "Enter" && onOpenModal?.()}
      className="border border-border rounded overflow-hidden flex mb-6 cursor-pointer transition-colors hover:border-fg-muted"
    >
      <div className="flex-shrink-0 overflow-hidden rounded-l">
        <FilmPoster
          src={film.poster}
          imdbId={film.imdbId}
          alt={film.title}
          size="featured"
          className="!rounded-none"
        />
      </div>
      <div className="p-4 flex-1 min-w-0">
        <div className="text-[17px] font-semibold leading-tight">
          {film.title}
        </div>
        <div className="text-xs text-fg-light mt-1 leading-relaxed">
          {film.tagline}
        </div>
        <div className="flex gap-0.5 mt-2.5 items-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              filled={i <= fullStars}
              half={i === fullStars + 1 && hasHalf}
            />
          ))}
          <span className="text-[11px] text-fg-muted ml-1.5">
            {film.rating} · {film.ratingCount} ratings
          </span>
        </div>
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {film.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-fg-muted border border-border px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-4 mt-3">
          <div>
            <div className="text-[13px] text-fg">
              {film.stats.thisWeek}
            </div>
            <div className="text-[10px] text-fg-muted tracking-wider">
              This week
            </div>
          </div>
          <div>
            <div className="text-[13px] text-fg">
              {film.stats.reviews}
            </div>
            <div className="text-[10px] text-fg-muted tracking-wider">
              Reviews
            </div>
          </div>
        </div>
      </div>
      <div
        className="flex flex-col justify-center gap-2 py-4 pr-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setWatched(!watched)}
          className={cn(
            "text-[11px] px-3 py-1.5 rounded border transition-all whitespace-nowrap text-center",
            watched
              ? "bg-fg text-bg border-fg"
              : "bg-transparent text-fg border-border hover:bg-fg hover:text-bg hover:border-fg"
          )}
        >
          {watched ? "Watched" : "+ Watched"}
        </button>
        <button
          type="button"
          onClick={() => setWatchlisted(!watchlisted)}
          className={cn(
            "text-[11px] px-3 py-1.5 rounded border border-border hover:bg-fg hover:text-bg hover:border-fg transition-all whitespace-nowrap text-center",
            watchlisted && "bg-fg text-bg border-fg"
          )}
        >
          + Watchlist
        </button>
        <button
          type="button"
          onClick={onOpenModal}
          className="text-[11px] px-3 py-1.5 rounded border border-border hover:bg-fg hover:text-bg hover:border-fg transition-all whitespace-nowrap text-center"
        >
          Review
        </button>
      </div>
    </div>
  );
}
