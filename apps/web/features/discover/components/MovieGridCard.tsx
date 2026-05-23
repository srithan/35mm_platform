"use client";

import { useState } from "react";
import { FilmPoster } from "@/components/FilmPoster";
import { cn } from "@/lib/utils/cn";

interface MovieGridCardProps {
  film: {
    id: string;
    title: string;
    year: number;
    director: string;
    genre: string;
    rating: number;
    count?: string;
    poster: string;
    imdbId?: string;
    bg?: string;
  };
  onOpenModal?: (film: MovieGridCardProps["film"]) => void;
  animationDelay?: number;
}

function MiniStar({ filled }: { filled: boolean }) {
  return (
    <div
      className={cn(
        "w-[7px] h-[7px] shrink-0",
        filled ? "bg-accent" : "bg-white/30"
      )}
      style={{
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      }}
    />
  );
}

export function MovieGridCard({
  film,
  onOpenModal,
  animationDelay = 0,
}: MovieGridCardProps) {
  const [watched, setWatched] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const roundedRating = Math.round(film.rating);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenModal?.(film)}
      onKeyDown={(e) => e.key === "Enter" && onOpenModal?.(film)}
      className={cn(
        "cursor-pointer animate-fade-up group",
        animationDelay && `[animation-delay:${animationDelay}ms]`
      )}
    >
      <div className="aspect-[2/3] rounded overflow-hidden bg-fg relative">
        <div className="absolute inset-0 z-0">
          <FilmPoster
            src={film.poster}
            imdbId={film.imdbId}
            alt={film.title}
            size="xl"
            className="w-full h-full rounded-none group-hover:scale-[1.03] group-hover:opacity-85 transition-all duration-300"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-fg/85 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2.5 gap-1.5 z-10">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <MiniStar key={i} filled={i <= roundedRating} />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setWatched(!watched);
              }}
              className="text-[9px] tracking-wider py-0.5 px-1.5 rounded bg-bg text-fg border-none cursor-pointer hover:bg-white transition-colors"
            >
              Watched
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setWatchlisted(!watchlisted);
              }}
              className="text-[9px] tracking-wider py-0.5 px-1.5 rounded bg-white/15 text-bg border border-white/20 cursor-pointer hover:bg-white/25 transition-colors"
            >
              + List
            </button>
          </div>
        </div>
      </div>
      <div className="text-xs leading-snug mt-2 text-fg">
        {film.title}
      </div>
      <div className="text-[10.5px] text-fg-muted mt-0.5">{film.year}</div>
    </div>
  );
}
