"use client";

import { LazyImage } from "@/components/LazyImage";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { posterUrl, starsFromVote, yearFromDate } from "../lib/tmdb-utils";

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

export const STREAMING_PROVIDER_OPTIONS = [
  { id: null, label: "All" },
  { id: 8, label: "Netflix" },
  { id: 9, label: "Prime Video" },
  { id: 15, label: "Hulu" },
  { id: 1899, label: "Max" },
  { id: 11, label: "MUBI" },
] as const;

export type StreamingProviderId =
  (typeof STREAMING_PROVIDER_OPTIONS)[number]["id"];

export function StreamingNowAisle({
  films,
  loading,
  activeProviderId,
  onProviderChange,
  onFilmClick,
}: {
  films: TMDBMovie[];
  loading: boolean;
  activeProviderId: StreamingProviderId;
  onProviderChange: (providerId: StreamingProviderId) => void;
  onFilmClick: FilmClickHandler;
}) {
  const activeProvider = STREAMING_PROVIDER_OPTIONS.find(function (provider) {
    return provider.id === activeProviderId;
  });
  const badgeLabel = activeProviderId == null ? "Streaming" : activeProvider?.label ?? "Streaming";

  if (films.length === 0 && !loading) return null;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-2xl font-semibold leading-tight text-fg">
          What&apos;s streaming right now
        </h3>
        <span className="hidden font-mono text-[11px] text-fg-muted sm:inline">
          Filtered to your services
        </span>
      </div>
      <div className="mb-5 flex flex-wrap gap-3 font-mono text-[11px]">
        {STREAMING_PROVIDER_OPTIONS.map(function (provider) {
          const selected = provider.id === activeProviderId;
          return (
            <button
              key={provider.label}
              type="button"
              onClick={function () {
                onProviderChange(provider.id);
              }}
              className={
                selected
                  ? "rounded-full bg-fg px-3 py-1.5 font-semibold text-bg"
                  : "rounded-full border border-border px-3 py-1.5 text-fg-muted transition hover:border-fg/30 hover:text-fg"
              }
            >
              {provider.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-8">
        {loading && films.length === 0
          ? Array.from({ length: 8 }).map(function (_, index) {
              return (
                <div key={index}>
                  <div className="aspect-[2/3] rounded-sm bg-skeleton" />
                  <div className="mt-2 h-3 rounded bg-skeleton" />
                </div>
              );
            })
          : films.slice(0, 8).map(function (film) {
            return (
              <button
                key={(film.media_type || "movie") + "-" + film.id}
                type="button"
                onClick={function () {
                  onFilmClick(film);
                }}
                className="group text-left"
              >
                <div className="relative">
                  <LazyImage
                    src={posterUrl(film.poster_path, "w342")}
                    alt={titleFor(film)}
                    aspectRatio="2/3"
                    className="w-full rounded-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:-rotate-[0.4deg] group-hover:shadow-[0_18px_30px_-18px_rgba(28,26,23,0.45)]"
                    sizes="(min-width: 768px) 12vw, 45vw"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-bg px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-fg shadow-sm">
                    {badgeLabel}
                  </span>
                </div>
                <span className="mt-2 block line-clamp-2 text-[12px] font-semibold leading-snug text-fg">
                  {titleFor(film)}
                </span>
              </button>
            );
          })}
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
          <h3 className="font-display text-3xl font-semibold leading-none">
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
            <button
              key={(film.media_type || "movie") + "-" + film.id}
              type="button"
              onClick={function () {
                onFilmClick(film);
              }}
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
            </button>
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
        <h3 className="font-display text-2xl font-semibold leading-tight text-fg">
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
              <button
                key={(film.media_type || "movie") + "-" + film.id}
                type="button"
                onClick={function () {
                  onFilmClick(film);
                }}
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
              </button>
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
  const visibleGroups = groups.filter(function (group) {
    return group.films.length > 0;
  });
  if (visibleGroups.length === 0) return null;

  return (
    <section className="grid gap-10 md:grid-cols-2">
      {visibleGroups.map(function (group) {
        return (
          <div key={group.title}>
            <div className="mb-4 flex items-baseline gap-4">
              <h3 className="font-display text-2xl font-semibold leading-tight text-fg">
                {group.title}
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {group.films.slice(0, 6).map(function (film) {
                return (
                  <button
                    key={(film.media_type || "movie") + "-" + film.id}
                    type="button"
                    onClick={function () {
                      onFilmClick(film);
                    }}
                    className="group min-w-0 text-left"
                    aria-label={titleFor(film)}
                  >
                    <LazyImage
                      src={posterUrl(film.poster_path, "w342")}
                      alt={titleFor(film)}
                      aspectRatio="2/3"
                      className="w-full rounded-sm transition-all duration-300 group-hover:-translate-y-1.5 group-hover:-rotate-[0.4deg] group-hover:shadow-[0_18px_30px_-18px_rgba(28,26,23,0.45)]"
                      sizes="(min-width: 1024px) 190px, 30vw"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
