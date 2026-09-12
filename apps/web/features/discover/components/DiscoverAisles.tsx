"use client";

import { useId } from "react";
import { LazyImage } from "@/components/LazyImage";
import { SHOW_POSTER_CARD_METADATA } from "@/lib/constants/uiFlags";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { posterUrl, starsFromVote, yearFromDate } from "../lib/tmdb-utils";
import { FilmTitleLink } from "./FilmTitleLink";

type FilmClickHandler = (film: TMDBMovie) => void;

function titleFor(film: TMDBMovie): string {
  return film.title || film.name || "Untitled";
}

function dateFor(film: TMDBMovie): string {
  return film.release_date || film.first_air_date || "";
}

function mediaKindFor(film: TMDBMovie): string {
  return film.media_type === "tv" || film.first_air_date ? "Series" : "";
}

export function SprocketDivider() {
  return (
    <div
      className="my-10 h-3 opacity-40"
      aria-hidden
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--fg) 2.5px, transparent 2.5px)",
        backgroundPosition: "center",
        backgroundSize: "22px 22px",
      }}
    />
  );
}

export function TicketDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={"h-px " + className}
      aria-hidden
      style={{
        backgroundImage:
          "repeating-linear-gradient(to right, var(--border) 0, var(--border) 8px, transparent 8px, transparent 16px)",
      }}
    />
  );
}

export function StreamingNowAisle({
  films,
  loading,
  onFilmClick,
}: {
  films: TMDBMovie[];
  loading: boolean;
  onFilmClick: FilmClickHandler;
}) {
  return (
    <section aria-labelledby="streaming-now-heading">
      <div className="mb-5">
        <h3
          id="streaming-now-heading"
          className="font-display text-xl font-semibold leading-tight text-fg sm:text-2xl"
        >
          What&apos;s streaming right now
        </h3>
      </div>
      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        {loading && films.length === 0 ? (
          <div
            className="flex items-start gap-3.5 pb-2 sm:grid sm:grid-cols-4 sm:gap-4 md:grid-cols-8"
            aria-hidden
          >
            {Array.from({ length: 8 }).map(function (_, index) {
              return (
                <div key={index} className="w-[122px] shrink-0 sm:w-auto">
                  <div className="aspect-[2/3] rounded-[7px] bg-skeleton sm:rounded-sm" />
                  <div className="mt-2 h-3 rounded bg-skeleton" />
                  <div className="mt-1.5 h-2.5 w-2/3 rounded bg-skeleton" />
                </div>
              );
            })}
          </div>
        ) : films.length > 0 ? (
          <ul
            aria-label="Streaming titles across your services"
            className="flex items-start gap-3.5 pb-2 sm:grid sm:grid-cols-4 sm:gap-4 md:grid-cols-8"
          >
            {films.slice(0, 8).map(function (film) {
              const metadata = [yearFromDate(dateFor(film)), mediaKindFor(film)]
                .filter(Boolean)
                .join(" · ");

              return (
                <li
                  key={(film.media_type || "movie") + "-" + film.id}
                  className="w-[122px] shrink-0 sm:w-auto"
                >
                  <FilmTitleLink
                    film={film}
                    onOpen={onFilmClick}
                    ariaLabel={"Open " + titleFor(film)}
                    className="group block w-full rounded-[7px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:rounded-sm"
                  >
                    <LazyImage
                      src={posterUrl(film.poster_path, "w342")}
                      alt={titleFor(film)}
                      aspectRatio="2/3"
                      className="w-full rounded-[7px] transition-all duration-300 sm:rounded-sm sm:group-hover:-translate-y-1.5 sm:group-hover:-rotate-[0.4deg] sm:group-hover:shadow-[0_18px_30px_-18px_rgba(28,26,23,0.45)] motion-reduce:transition-none"
                      sizes="(min-width: 768px) 12vw, (min-width: 640px) 23vw, 122px"
                    />
                    {SHOW_POSTER_CARD_METADATA ? (
                      <span className="mt-2 block">
                        <span className="block line-clamp-2 text-xs font-semibold leading-snug text-fg">
                          {titleFor(film)}
                        </span>
                        {metadata ? (
                          <span className="mt-1 block truncate text-[10.5px] leading-none text-fg-muted">
                            {metadata}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </FilmTitleLink>
                </li>
              );
            })}
          </ul>
        ) : (
          <div
            role="status"
            className="flex min-h-32 items-center justify-center rounded-sm border border-dashed border-border bg-elevated px-5 text-center"
          >
            <p className="max-w-sm text-[13px] leading-relaxed text-fg-muted">
              No streaming titles found for your saved services.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function RankedFilmAisle({
  films,
  onFilmClick,
}: {
  films: TMDBMovie[];
  onFilmClick: FilmClickHandler;
}) {
  if (films.length === 0) return null;

  return (
    <section className="rounded-sm bg-fg px-5 py-7 text-bg sm:px-7 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-film-red)]">
            Catalog ranked
          </p>
          <h3 className="font-display text-2xl font-semibold leading-none sm:text-3xl">
            Top rated right now
          </h3>
        </div>
        <a
          href="/discover?ranked=top-rated"
          className="hidden font-mono text-[11px] text-bg/70 underline underline-offset-4 transition hover:text-bg sm:inline"
        >
          View full list
        </a>
      </div>

      <div className="grid grid-cols-1 gap-x-10 gap-y-1 md:grid-cols-2">
        {films.slice(0, 10).map(function (film, index) {
          const year = yearFromDate(dateFor(film));
          return (
            <FilmTitleLink
              key={(film.media_type || "movie") + "-" + film.id}
              film={film}
              onOpen={onFilmClick}
              className="group flex w-full items-center gap-4 border-b border-[color-mix(in_srgb,var(--bg)_10%,transparent)] py-2.5 text-left"
            >
              <span
                className="w-11 shrink-0 text-center font-display text-3xl italic leading-none text-bg/10"
                style={{
                  WebkitTextStroke:
                    "1.25px color-mix(in srgb, var(--bg) 52%, transparent)",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <LazyImage
                src={posterUrl(film.poster_path, "w185")}
                alt={titleFor(film)}
                aspectRatio="2/3"
                className="h-14 w-10 shrink-0 rounded-sm"
                sizes="40px"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-bg transition group-hover:text-bg/80">
                  {titleFor(film)}
                </span>
                <span className="mt-1 block truncate font-mono text-[11px] text-bg/52">
                  {[year, "★ " + starsFromVote(film.vote_average).toFixed(1), mediaKindFor(film)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </FilmTitleLink>
          );
        })}
      </div>
    </section>
  );
}

export function EditorialFilmAisle({
  title,
  subtitle,
  films,
  onFilmClick,
}: {
  title: string;
  subtitle: string;
  films: TMDBMovie[];
  onFilmClick: FilmClickHandler;
}) {
  if (films.length === 0) return null;

  return (
    <section>
      <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        Program
      </p>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-xl font-semibold leading-tight text-fg sm:text-2xl">
          {title}
        </h3>
        <span className="hidden font-mono text-[11px] text-fg-muted sm:inline">
          {subtitle}
        </span>
      </div>
      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6 lg:-mx-2 lg:px-2">
        <div className="flex items-start gap-5 pb-3">
          {films.slice(0, 8).map(function (film, index) {
            const year = yearFromDate(dateFor(film));
            return (
              <FilmTitleLink
                key={(film.media_type || "movie") + "-" + film.id}
                film={film}
                onOpen={onFilmClick}
                className="group relative w-36 shrink-0 text-left sm:w-40"
              >
                <span
                  className="absolute -left-2 -top-3 z-10 font-display text-4xl italic leading-none text-bg"
                  style={{ WebkitTextStroke: "1.25px var(--fg)" }}
                >
                  {index + 1}
                </span>
                <LazyImage
                  src={posterUrl(film.poster_path, "w342")}
                  alt={titleFor(film)}
                  aspectRatio="2/3"
                  className="w-full rounded-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:-rotate-[0.4deg] group-hover:shadow-[0_18px_30px_-18px_rgba(28,26,23,0.45)]"
                  sizes="160px"
                />
                <span className="mt-3 block line-clamp-2 text-[13px] font-semibold leading-snug text-fg">
                  {titleFor(film)}
                </span>
                {year ? (
                  <span className="mt-1 block font-mono text-[11px] text-fg-muted">
                    {year}
                  </span>
                ) : null}
              </FilmTitleLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function MoodGridAisles({
  groups,
  onFilmClick,
}: {
  groups: { title: string; films: TMDBMovie[] }[];
  onFilmClick: FilmClickHandler;
}) {
  const headingIdPrefix = useId();
  const visibleGroups = groups.filter(function (group) {
    return group.films.length > 0;
  });
  if (visibleGroups.length === 0) return null;

  return (
    <section
      aria-label="Genre collections"
      className="grid gap-6 md:grid-cols-2 md:gap-5 lg:gap-6"
    >
      {visibleGroups.map(function (group, groupIndex) {
        const headingId = `${headingIdPrefix}-${groupIndex}`;
        const visibleFilmCount = Math.min(group.films.length, 6);

        return (
          <section
            key={group.title}
            aria-labelledby={headingId}
            className="rounded-sm border border-border-strong bg-sunken p-4 sm:p-5 lg:p-6"
          >
            <div className="mb-5 border-b border-border-strong pb-4">
              <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
                <span className="text-film-red">Genre program</span>
                <span className="shrink-0 text-fg-muted">
                  {visibleFilmCount} {visibleFilmCount === 1 ? "film" : "films"}
                </span>
              </div>
              <h3
                id={headingId}
                className="font-display text-xl font-semibold leading-tight text-fg sm:text-2xl"
              >
                {group.title}
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {group.films.slice(0, 6).map(function (film) {
                return (
                  <FilmTitleLink
                    key={(film.media_type || "movie") + "-" + film.id}
                    film={film}
                    onOpen={onFilmClick}
                    className="group min-w-0 text-left"
                    ariaLabel={titleFor(film)}
                  >
                    <LazyImage
                      src={posterUrl(film.poster_path, "w342")}
                      alt={titleFor(film)}
                      aspectRatio="2/3"
                      className="w-full rounded-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:-rotate-[0.4deg] group-hover:shadow-[0_18px_30px_-18px_rgba(28,26,23,0.45)]"
                      sizes="(min-width: 1024px) 190px, 30vw"
                    />
                  </FilmTitleLink>
                );
              })}
            </div>
          </section>
        );
      })}
    </section>
  );
}
