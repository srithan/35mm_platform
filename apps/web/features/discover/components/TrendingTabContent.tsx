"use client";

import { FilmShelf } from "./FilmShelf";
import { useTrending } from "../hooks/useDiscoverData";
import type { TMDBMovie } from "@/lib/tmdb/types";

interface TrendingTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
}

export function TrendingTabContent({ onOpenDetail }: TrendingTabContentProps) {
  const { movies } = useTrending();

  return (
    <div className="w-full pb-8 pt-2">
      <div className="bg-bg py-6 rounded-2xl">
        <FilmShelf
          title="Trending This Week"
          films={movies}
          onFilmClick={onOpenDetail}
        />
      </div>
    </div>
  );
}
