"use client";

import { useState } from "react";
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
        "group grid min-h-[420px] w-full overflow-hidden rounded-sm border border-[var(--fg)] md:grid-cols-5",
        "cursor-pointer bg-[var(--discover-placeholder)] text-left shadow-sm",
        "transition-shadow hover:shadow-[0_18px_34px_-18px_rgba(28,26,23,0.5)]"
      )}
    >
      <div className="relative min-h-[420px] overflow-hidden text-white md:col-span-3">
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
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5"
          aria-hidden
        />

        <div className="relative z-10 flex min-h-[420px] max-w-2xl flex-col justify-end gap-5 p-5 font-sans antialiased md:p-8">
          <div className="min-w-0 space-y-4">
            {label ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-sm border border-transparent bg-bg px-3 py-1",
                  "font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg shadow-sm"
                )}
              >
                {label}
              </span>
            ) : null}

            <div>
              <h2 className="max-w-xl font-display text-[2.35rem] font-semibold leading-[1.02] text-white md:text-[3.4rem]">
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
            <button
              type="button"
              onClick={function () {
                onOpenDetail(film);
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--color-film-red)] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Details
            </button>
            <button
              type="button"
              onClick={function () {
                setWatchlisted(!watchlisted);
              }}
              className={cn(
                "inline-flex min-h-10 items-center justify-center rounded-full border px-5 py-2.5 text-[13px] font-semibold transition-colors",
                watchlisted
                  ? "bg-white text-black hover:bg-white"
                  : "border-white/60 text-white hover:bg-white/10"
              )}
            >
              {watchlisted ? "Saved" : "Watchlist"}
            </button>
            <button
              type="button"
              onClick={function () {
                setWatched(!watched);
              }}
              className={cn(
                "inline-flex min-h-10 items-center justify-center px-1 py-2.5 text-[13px] font-semibold text-white underline decoration-white/40 underline-offset-4 transition-colors hover:text-white/80 hover:decoration-white/70",
                watched && "text-white/80 decoration-white/70"
              )}
            >
              {watched ? "Watched" : "Mark watched"}
            </button>
          </div>
        </div>
      </div>

      <aside className="flex min-h-[240px] flex-col justify-between bg-sunken p-6 text-fg md:col-span-2 md:min-h-[420px] md:p-7">
        <div>
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
            Program note
          </p>
          <p className="text-[14px] leading-relaxed text-fg-muted">
            {film.overview
              ? film.overview.slice(0, 180) + (film.overview.length > 180 ? "..." : "")
              : "A featured title from the current discovery program."}
          </p>
        </div>
        <div className="my-6 h-px bg-[repeating-linear-gradient(to_right,var(--border)_0,var(--border)_8px,transparent_8px,transparent_16px)]" />
        <div className="space-y-4">
          <div>
            <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">
              Catalog signal
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded bg-fg px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-bg">
                {stars.toFixed(1)} / 5
              </span>
              {film.vote_count ? (
                <span className="rounded border border-fg px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-fg">
                  {Intl.NumberFormat("en", { notation: "compact" }).format(film.vote_count)} votes
                </span>
              ) : null}
              {year ? (
                <span className="rounded border border-border px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                  {year}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
