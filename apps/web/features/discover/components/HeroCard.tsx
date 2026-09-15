"use client";

import { useState } from "react";
import { LazyImage } from "@/components/LazyImage";
import { heroUrl, posterUrl, yearFromDate } from "../lib/tmdb-utils";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { BROWSE_RAIL_ENABLED } from "@/lib/config/uiFlags";
import { cn } from "@/lib/utils/cn";
import { FilmTitleLink } from "./FilmTitleLink";

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
  const backdrop = heroUrl(film.backdrop_path || film.poster_path);
  const poster = posterUrl(film.poster_path, "w500");
  const year = yearFromDate(
    (film.release_date || film.first_air_date || "") as string
  );
  const programNote =
    (tagline && tagline.trim()) ||
    (film.overview && film.overview.trim()) ||
    "A featured title from the current discovery program.";
  const programNotePreview =
    programNote.slice(0, 180) + (programNote.length > 180 ? "..." : "");

  return (
    <article
      className={cn(
        "group relative w-full text-left",
        "transition-transform duration-300 ease-out hover:-translate-y-0.5 motion-reduce:transition-none"
      )}
    >
      <FilmTitleLink
        film={film}
        onOpen={onOpenDetail}
        ariaLabel={"Open " + (film.title || film.name || "title") + " cover"}
        className={cn(
          "relative block overflow-hidden bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30",
          BROWSE_RAIL_ENABLED
            ? "h-[190px] sm:h-[280px] lg:h-[320px]"
            : "h-[210px] sm:h-[320px] lg:h-[360px]"
        )}
      >
        <LazyImage
          src={backdrop}
          alt={film.title || film.name || "Unknown"}
          aspectRatio="16/9"
          className={cn(
            "h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.025]",
            "[&>img]:h-full [&>img]:w-full [&>img]:object-cover [&>img]:object-[center_30%]"
          )}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--bg) 0%, transparent 48%), linear-gradient(to right, var(--bg), transparent 12%, transparent 88%, var(--bg))",
          }}
          aria-hidden
        />
        {label ? (
          <span
            className={cn(
              "absolute left-4 top-4 inline-flex items-center rounded-full border border-white/40 bg-black/35 px-3 py-1.5",
              "font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-sm backdrop-blur-sm"
            )}
          >
            {label}
          </span>
        ) : null}
      </FilmTitleLink>

      <div
        className={cn(
          "relative z-10 grid items-end px-4",
          BROWSE_RAIL_ENABLED
            ? "-mt-12 grid-cols-[72px_minmax(0,1fr)] gap-3.5 sm:-mt-16 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5 sm:px-5 lg:-mt-20 lg:grid-cols-[136px_minmax(0,1fr)] lg:gap-6"
            : "-mt-14 grid-cols-[76px_minmax(0,1fr)] gap-4 sm:-mt-20 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-6 sm:px-6 lg:grid-cols-[156px_minmax(0,1fr)] lg:gap-8"
        )}
      >
        <FilmTitleLink
          film={film}
          onOpen={onOpenDetail}
          ariaLabel={"Open " + (film.title || film.name || "title") + " poster"}
          className="aspect-[2/3] self-start overflow-hidden rounded-sm bg-sunken shadow-[0_12px_35px_rgba(0,0,0,0.18)] transition-transform duration-300 group-hover:-translate-y-1 motion-reduce:transition-none"
        >
          {poster ? (
            <LazyImage
              src={poster}
              alt={(film.title || film.name || "Unknown") + " poster"}
              aspectRatio="2/3"
              className="h-full w-full"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center font-display text-fg-muted">
              {film.title || film.name}
            </div>
          )}
        </FilmTitleLink>

        <div
          className={cn(
            "min-w-0 pb-1",
            BROWSE_RAIL_ENABLED ? "pt-12 sm:pt-16 lg:pt-20" : "pt-14 sm:pt-20"
          )}
        >
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-muted sm:mb-3">
            {label || "Featured"}
            {year ? " / " + year : ""}
          </p>
          <FilmTitleLink film={film} onOpen={onOpenDetail} className="block">
            <h2
              className={cn(
                "break-words font-display font-normal leading-[0.98] tracking-[-0.045em] text-fg",
                BROWSE_RAIL_ENABLED
                  ? "text-[clamp(1.65rem,3.1vw,3.25rem)]"
                  : "text-[clamp(2rem,5vw,4.4rem)]"
              )}
            >
              {film.title || film.name}
            </h2>
          </FilmTitleLink>
          {runtime ? (
            <p className="mt-3 text-xs text-fg-muted">{runtime} min</p>
          ) : null}
          <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
            {programNotePreview}
          </p>

          <div className="relative z-20 flex flex-wrap items-center gap-2">
            <FilmTitleLink
              film={film}
              onOpen={onOpenDetail}
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-fg px-5 py-2.5 text-[13px] font-semibold text-bg shadow-sm transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_88%,var(--accent)_12%)]"
            >
              Details
            </FilmTitleLink>
            <button
              type="button"
              onClick={function () {
                setWatchlisted(!watchlisted);
              }}
              className={cn(
                "mt-4 inline-flex min-h-10 items-center justify-center rounded-full border px-5 py-2.5 text-[13px] font-semibold shadow-sm transition-colors",
                watchlisted
                  ? "border-fg bg-fg text-bg hover:bg-fg"
                  : "border-border bg-elevated text-fg hover:border-border-strong hover:bg-sunken"
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
                "mt-4 inline-flex min-h-10 items-center justify-center px-1 py-2.5 text-[13px] font-semibold text-fg-muted underline decoration-fg-muted/40 underline-offset-4 transition-colors hover:text-fg hover:decoration-fg/70",
                watched && "text-fg decoration-fg/70"
              )}
            >
              {watched ? "Watched" : "Mark watched"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
