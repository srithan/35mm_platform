"use client";

import { BookmarkPlus, Check } from "lucide-react";
import { LazyImage } from "@/components/LazyImage";
import { posterUrl, yearFromDate } from "../lib/tmdb-utils";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { tmdbMovieToFilmPayload } from "@/features/lists/api/listsApi";
import { useWatchlistMutation } from "@/features/lists/hooks/useLists";

interface FilmShelfProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  films: TMDBMovie[];
  onFilmClick: (film: TMDBMovie) => void;
}

export function FilmShelf({
  title,
  eyebrow,
  subtitle,
  films,
  onFilmClick,
}: FilmShelfProps) {
  const watchlistMutation = useWatchlistMutation();
  if (films.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-2.5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="font-display text-xl font-semibold leading-none text-fg sm:text-2xl">
            {title}
          </h3>
        </div>
        <span className="hidden font-mono text-[11px] text-fg-muted sm:inline">
          {subtitle ?? "Browse"}
        </span>
      </div>
      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6 lg:-mx-2 lg:px-2">
        <div className="flex items-start gap-3 pb-2 md:gap-4">
          {films.map((film) => {
            const isPending =
              watchlistMutation.isPending &&
              watchlistMutation.variables?.film?.tmdbId === film.id;

            return (
            <div
              key={film.id}
              className="group w-[116px] flex-shrink-0 text-left sm:w-[132px] lg:w-[148px]"
            >
              <div className="relative mb-2 aspect-[2/3] overflow-hidden rounded-sm bg-[var(--discover-placeholder)] shadow-sm ring-1 ring-black/5 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:-rotate-[0.4deg] group-hover:shadow-[0_18px_30px_-18px_rgba(28,26,23,0.45)]">
                <button type="button" onClick={() => onFilmClick(film)} className="block h-full w-full">
                  <LazyImage
                    src={posterUrl(film.poster_path)}
                    alt={film.title || film.name || "Unknown"}
                    aspectRatio="2/3"
                    className="h-full w-full"
                  />
                </button>
                <button
                  type="button"
                  onClick={function () {
                    watchlistMutation.mutate({ film: tmdbMovieToFilmPayload(film) });
                  }}
                  disabled={isPending}
                  className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-fg/80 text-bg shadow-sm opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 focus:opacity-100 disabled:opacity-60"
                  aria-label="Add to watchlist"
                  title="Add to watchlist"
                >
                  {isPending ? <Check className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
                </button>
              </div>
              <button type="button" onClick={() => onFilmClick(film)} className="block w-full text-left">
                <div className="line-clamp-2 text-[13px] leading-snug text-fg">
                  {film.title || film.name}
                </div>
                <div className="text-[10.5px] text-fg-muted mt-0.5">
                  {yearFromDate(film.release_date || film.first_air_date || "")}
                </div>
              </button>
            </div>
          );
          })}
        </div>
      </div>
    </section>
  );
}
