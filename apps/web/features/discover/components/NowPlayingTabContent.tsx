"use client";

import { FilmShelf } from "./FilmShelf";
import { useNowPlaying } from "../hooks/useDiscoverData";
import { DEFAULT_DISCOVER_EXPLORE_FILTERS } from "../lib/discoverExploreFilters";
import type { TMDBMovie } from "@/lib/tmdb/types";

interface NowPlayingTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
}

export function NowPlayingTabContent({ onOpenDetail }: NowPlayingTabContentProps) {
  const { movies } = useNowPlaying(null, "all", DEFAULT_DISCOVER_EXPLORE_FILTERS);

  return (
    <div className="w-full pb-8 pt-2">
      <div className="bg-bg py-6 rounded-2xl">
        <FilmShelf
          title="Now Playing"
          films={movies}
          onFilmClick={onOpenDetail}
        />
      </div>
    </div>
  );
}
