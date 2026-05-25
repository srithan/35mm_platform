"use client";

import { FilmShelf } from "./FilmShelf";
import { useTrending } from "../hooks/useDiscoverData";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { DiscoverShelfSkeleton } from "./DiscoverSkeletons";

interface TrendingTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
}

export function TrendingTabContent({ onOpenDetail }: TrendingTabContentProps) {
  const { movies, loading } = useTrending();

  return (
    <div className="w-full pb-8 pt-2">
      <div className="bg-bg py-6 rounded-2xl">
        {movies.length > 0 ? (
          <FilmShelf
            title="Trending This Week"
            films={movies}
            onFilmClick={onOpenDetail}
          />
        ) : loading ? (
          <DiscoverShelfSkeleton titleWidth="w-40" cardCount={7} />
        ) : null}
      </div>
    </div>
  );
}
