"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { LazyImage } from "@/components/LazyImage";
import { heroUrl, starsFromVote, yearFromDate } from "../lib/tmdb-utils";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { cn } from "@/lib/utils/cn";

interface HeroCardProps {
  film: TMDBMovie;
  /** Shown as a small badge; omit or pass empty string to hide */
  label?: string | null;
  runtime?: number | null;
  tagline?: string | null;
  onOpenDetail: (film: TMDBMovie) => void;
}

export function HeroCard({
  film,
  label,
  runtime,
  tagline,
  onOpenDetail,
}: HeroCardProps) {
  const [watched, setWatched] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const stars = starsFromVote(film.vote_average);
  const backdrop = heroUrl(film.backdrop_path || film.poster_path);
  const year = yearFromDate(
    (film.release_date || film.first_air_date || "") as string
  );
  const blurb =
    (tagline && tagline.trim()) ||
    (film.overview && film.overview.trim().slice(0, 220)) ||
    null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={function () {
        onOpenDetail(film);
      }}
      onKeyDown={function (e) {
        if (e.key === "Enter") onOpenDetail(film);
      }}
      className={cn(
        "group relative min-h-[420px] w-full overflow-hidden rounded-2xl",
        "cursor-pointer bg-[var(--discover-placeholder)] text-left text-white shadow-sm",
        "transition-shadow hover:shadow-lg md:min-h-[520px] xl:min-h-[580px]"
      )}
    >
      <div className="absolute inset-0">
        <LazyImage
          src={backdrop}
          alt={film.title || film.name || "Unknown"}
          aspectRatio="16/9"
          className={cn(
            "h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.025]",
            "[&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:object-center"
          )}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5 md:bg-[linear-gradient(90deg,rgba(0,0,0,.82)_0%,rgba(0,0,0,.58)_38%,rgba(0,0,0,.14)_72%,rgba(0,0,0,.04)_100%)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-[420px] max-w-2xl flex-col justify-end gap-5 p-5 font-sans antialiased md:min-h-[520px] md:p-8 xl:min-h-[580px]">
        <div className="min-w-0 space-y-4">
          {label ? (
            <span
              className={cn(
                "inline-flex items-center rounded-full border border-white/20 bg-white/12 px-3 py-1",
                "text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md"
              )}
            >
              {label}
            </span>
          ) : null}

          <div>
            <h2 className="max-w-xl text-[2rem] font-semibold leading-[1.02] tracking-tight text-white md:text-[3rem]">
              {film.title || film.name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium text-white/78">
              {year ? <span>{year}</span> : null}
              {year ? <span className="text-white/38">·</span> : null}
              <span className="tabular-nums">{stars.toFixed(1)} / 5</span>
              {runtime ? (
                <>
                  <span className="text-white/38">·</span>
                  <span>{runtime} min</span>
                </>
              ) : null}
            </div>
          </div>

          {blurb ? (
            <p className="line-clamp-3 max-w-xl text-[13.5px] leading-relaxed text-white/78 md:text-[14px]">
              {blurb}
              {film.overview && film.overview.length > 220 ? "..." : ""}
            </p>
          ) : null}
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          onClick={function (e) {
            e.stopPropagation();
          }}
        >
          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={function () {
              setWatched(!watched);
            }}
            className={cn(
              "h-auto min-h-0 rounded-full border-white/18 px-3.5 py-2 text-[12px] font-medium normal-case text-white",
              watched
                ? "bg-white text-black hover:bg-white"
                : "bg-white/12 hover:bg-white/18"
            )}
          >
            {watched ? "Watched" : "Mark watched"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="secondary"
            onClick={function () {
              setWatchlisted(!watchlisted);
            }}
            className={cn(
              "h-auto min-h-0 rounded-full border-white/18 px-3.5 py-2 text-[12px] font-medium normal-case text-white",
              watchlisted
                ? "border-[var(--discover-tab-active)] !bg-[var(--discover-tab-active)]/80 hover:!border-[var(--discover-tab-active)] hover:!bg-[var(--discover-tab-active)]"
                : "bg-white/12 hover:bg-white/18"
            )}
          >
            {watchlisted ? "Saved" : "Watchlist"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="primary"
            onClick={function () {
              onOpenDetail(film);
            }}
            className="h-auto min-h-0 rounded-full bg-white px-3.5 py-2 text-[12px] font-medium normal-case text-black hover:bg-white/90"
          >
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}
