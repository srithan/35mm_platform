"use client";

import { FilmShelf } from "./FilmShelf";
import { usePopularTV, useOnTheAirTV, useTopRatedTV } from "../hooks/useDiscoverData";
import type { TMDBMovie } from "@/lib/tmdb/types";

interface TVShowsTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
}

export function TVShowsTabContent({ onOpenDetail }: TVShowsTabContentProps) {
  const { tvShows: popularTV } = usePopularTV();
  const { tvShows: onTheAirTV } = useOnTheAirTV();
  const { tvShows: topRatedTV } = useTopRatedTV();

  return (
    <div className="w-full pb-8 pt-2 space-y-6">
      <div className="bg-bg py-6 rounded-2xl">
        <FilmShelf
          title="Popular TV Shows"
          films={popularTV}
          onFilmClick={onOpenDetail}
        />
      </div>

      <div className="bg-bg py-6 rounded-2xl">
        <FilmShelf
          title="On The Air"
          films={onTheAirTV}
          onFilmClick={onOpenDetail}
        />
      </div>

      <div className="bg-bg py-6 rounded-2xl">
        <FilmShelf
          title="Top Rated TV Shows"
          films={topRatedTV}
          onFilmClick={onOpenDetail}
        />
      </div>
    </div>
  );
}
