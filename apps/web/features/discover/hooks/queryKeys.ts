import type { DiscoverMoodId } from "../lib/discoverMoodFilters";
import type { DiscoverExploreFiltersState } from "../lib/discoverExploreFilters";

export const discoverKeys = {
  all: ["discover"] as const,
  genres: () => ["discover", "genres"] as const,
  popular: (
    genreId: number | null,
    moodId: DiscoverMoodId,
    exploreFilters: DiscoverExploreFiltersState
  ) => ["discover", "popular", genreId, moodId, exploreFilters] as const,
  nowPlaying: (
    genreId: number | null,
    moodId: DiscoverMoodId,
    exploreFilters: DiscoverExploreFiltersState
  ) => ["discover", "now-playing", genreId, moodId, exploreFilters] as const,
  trending: () => ["discover", "trending"] as const,
  topRated: () => ["discover", "top-rated"] as const,
  streamingNow: (providerId: number | null) =>
    ["discover", "streaming-now", providerId] as const,
  searchMulti: (query: string) => ["discover", "search-multi", query.trim().toLowerCase()] as const,
  popularTv: () => ["discover", "tv", "popular"] as const,
  topRatedTv: () => ["discover", "tv", "top-rated"] as const,
  onTheAirTv: () => ["discover", "tv", "on-the-air"] as const,
};
