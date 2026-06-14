"use client";

import { LazyImage } from "@/components/LazyImage";
import { posterUrl, yearFromDate } from "../lib/tmdb-utils";
import type { TMDBMovie } from "@/lib/tmdb/types";

interface FilmShelfProps {
  title: string;
  films: TMDBMovie[];
  onFilmClick: (film: TMDBMovie) => void;
}

export function FilmShelf({
  title,
  films,
  onFilmClick,
}: FilmShelfProps) {
  if (films.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="h-5 w-1 rounded-full bg-accent" aria-hidden />
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold leading-none tracking-tight text-fg">
            {title}
          </h3>
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
