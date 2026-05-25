"use client";

import { FilmShelf } from "./FilmShelf";
import { useNowPlaying } from "../hooks/useDiscoverData";
import { DEFAULT_DISCOVER_EXPLORE_FILTERS } from "../lib/discoverExploreFilters";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { DiscoverShelfSkeleton } from "./DiscoverSkeletons";

interface NowPlayingTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
}

export function NowPlayingTabContent({ onOpenDetail }: NowPlayingTabContentProps) {
  const { movies, loading } = useNowPlaying(null, "all", DEFAULT_DISCOVER_EXPLORE_FILTERS);

  return (
    <div className="w-full pb-8 pt-2">
      <div className="bg-bg py-6 rounded-2xl">
        {movies.length > 0 ? (
          <FilmShelf
            title="Now Playing"
            films={movies}
            onFilmClick={onOpenDetail}
          />
        ) : loading ? (
          <DiscoverShelfSkeleton titleWidth="w-32" cardCount={7} />
        ) : null}
      </div>
    </div>
  );
}
