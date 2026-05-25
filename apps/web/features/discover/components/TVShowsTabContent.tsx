"use client";

import { FilmShelf } from "./FilmShelf";
import { usePopularTV, useOnTheAirTV, useTopRatedTV } from "../hooks/useDiscoverData";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { DiscoverShelfSkeleton } from "./DiscoverSkeletons";

interface TVShowsTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
}

export function TVShowsTabContent({ onOpenDetail }: TVShowsTabContentProps) {
  const { tvShows: popularTV, loading: popularLoading } = usePopularTV();
  const { tvShows: onTheAirTV, loading: onTheAirLoading } = useOnTheAirTV();
  const { tvShows: topRatedTV, loading: topRatedLoading } = useTopRatedTV();

  return (
    <div className="w-full pb-8 pt-2 space-y-6">
      <div className="bg-bg py-6 rounded-2xl">
        {popularTV.length > 0 ? (
          <FilmShelf
            title="Popular TV Shows"
            films={popularTV}
            onFilmClick={onOpenDetail}
          />
        ) : popularLoading ? (
          <DiscoverShelfSkeleton titleWidth="w-44" cardCount={7} />
        ) : null}
      </div>

      <div className="bg-bg py-6 rounded-2xl">
        {onTheAirTV.length > 0 ? (
          <FilmShelf
            title="On The Air"
            films={onTheAirTV}
            onFilmClick={onOpenDetail}
          />
        ) : onTheAirLoading ? (
          <DiscoverShelfSkeleton titleWidth="w-32" cardCount={7} />
        ) : null}
      </div>

      <div className="bg-bg py-6 rounded-2xl">
        {topRatedTV.length > 0 ? (
          <FilmShelf
            title="Top Rated TV Shows"
            films={topRatedTV}
            onFilmClick={onOpenDetail}
          />
        ) : topRatedLoading ? (
          <DiscoverShelfSkeleton titleWidth="w-40" cardCount={7} />
        ) : null}
      </div>
    </div>
  );
}
