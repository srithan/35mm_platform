"use client";

import { LazyImage } from "@/components/LazyImage";
import { posterUrl, yearFromDate } from "../lib/tmdb-utils";
import type { TMDBMovie } from "@/lib/tmdb/types";

interface FilmShelfProps {
  title: string;
  subtitle?: string;
  films: TMDBMovie[];
  onFilmClick: (film: TMDBMovie) => void;
}

export function FilmShelf({
  title,
  subtitle,
  films,
  onFilmClick,
}: FilmShelfProps) {
  if (films.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-fg">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6 lg:-mx-2 lg:px-2">
        <div className="flex items-start gap-3 pb-2 md:gap-4">
          {films.map((film) => (
            <button
              key={film.id}
              type="button"
              onClick={() => onFilmClick(film)}
              className="group w-[116px] flex-shrink-0 text-left sm:w-[132px] lg:w-[148px]"
            >
              <div className="mb-2 aspect-[2/3] overflow-hidden rounded-xl bg-[var(--discover-placeholder)] shadow-sm ring-1 ring-black/5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                <LazyImage
                  src={posterUrl(film.poster_path)}
                  alt={film.title || film.name || "Unknown"}
                  aspectRatio="2/3"
                  className="h-full w-full"
                />
              </div>
              <div className="line-clamp-2 text-[13px] leading-snug text-fg">
                {film.title || film.name}
              </div>
              <div className="text-[10.5px] text-fg-muted mt-0.5">
                {yearFromDate(film.release_date || film.first_air_date || "")}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
