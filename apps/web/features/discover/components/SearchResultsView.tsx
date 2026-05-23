"use client";

import { LazyImage } from "@/components/LazyImage";
import { posterUrl, yearFromDate } from "../lib/tmdb-utils";
import type { TMDBMovie } from "@/lib/tmdb/types";

interface SearchResultsViewProps {
  query: string;
  movies: TMDBMovie[];
  loading: boolean;
  onFilmClick: (film: TMDBMovie) => void;
}

export function SearchResultsView({
  query,
  movies,
  loading,
  onFilmClick,
}: SearchResultsViewProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-fg-muted text-sm ">
        Searching...
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-fg-muted font-sans text-sm">
          No results found for &lsquo;{query}&rsquo;
        </p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {movies.map((film) => (
          <button
            key={film.id}
            type="button"
            onClick={function () {
              onFilmClick(film);
            }}
            className="text-left group"
          >
            <div className="rounded-xl overflow-hidden bg-[var(--discover-placeholder)] shadow-md aspect-[2/3] mb-2">
              <LazyImage
                src={posterUrl(film.poster_path)}
                alt={film.title || film.name || "Unknown"}
                aspectRatio="2/3"
                className="w-full h-full"
              />
            </div>
            <div className="text-[13px] leading-snug text-fg line-clamp-2">
              {film.title || film.name}
            </div>
            <div className="text-[10.5px] text-fg-muted mt-0.5">
              {yearFromDate(film.release_date || film.first_air_date || "")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
