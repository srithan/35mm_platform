"use client";

import { FilmShelf } from "./FilmShelf";
import { useTopRated } from "../hooks/useDiscoverData";
import type { TMDBMovie } from "@/lib/tmdb/types";

interface TopRatedTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
}

export function TopRatedTabContent({ onOpenDetail }: TopRatedTabContentProps) {
  const { movies } = useTopRated();

  return (
    <div className="w-full pb-8 pt-2 space-y-6">
      <div className="bg-bg py-6 rounded-2xl">
        <FilmShelf
          title="Top Rated Movies"
          films={movies}
          onFilmClick={onOpenDetail}
        />
      </div>
    </div>
  );
}
