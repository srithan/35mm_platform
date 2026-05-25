"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TMDBMovie, TMDBGenre } from "@/lib/tmdb/types";
import type { DiscoverMoodId } from "../lib/discoverMoodFilters";
import {
  buildDiscoverExploreUrl,
  shouldUseDiscoverList,
  discoverRecentSortBy,
  type DiscoverExploreFiltersState,
} from "../lib/discoverExploreFilters";
import { discoverKeys } from "./queryKeys";

const DISCOVER_STALE_TIME_MS = 300_000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`);
  return res.json();
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debounced;
}

export function useGenres() {
  const query = useQuery({
    queryKey: discoverKeys.genres(),
    queryFn: () => fetchJson<{ genres: TMDBGenre[] }>("/api/tmdb/genre/movie/list"),
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return { genres: query.data?.genres ?? [], loading: query.isLoading };
}

export function usePopular(
  genreId: number | null,
  moodId: DiscoverMoodId,
  exploreFilters: DiscoverExploreFiltersState
) {
  const query = useQuery({
    queryKey: discoverKeys.popular(genreId, moodId, exploreFilters),
    queryFn: () => {
      const useDiscover = shouldUseDiscoverList(genreId, moodId, exploreFilters);
      const url = useDiscover
        ? buildDiscoverExploreUrl({
            sortBy: "popularity.desc",
            genreId,
            moodId,
            filters: exploreFilters,
          })
        : "/api/tmdb/movie/popular?page=1";
      return fetchJson<{ results: TMDBMovie[] }>(url);
    },
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return { movies: query.data?.results ?? [], loading: query.isLoading };
}

export function useNowPlaying(
  genreId: number | null,
  moodId: DiscoverMoodId,
  exploreFilters: DiscoverExploreFiltersState
) {
  const query = useQuery({
    queryKey: discoverKeys.nowPlaying(genreId, moodId, exploreFilters),
    queryFn: () => {
      const useDiscover = shouldUseDiscoverList(genreId, moodId, exploreFilters);
      const sortBy = discoverRecentSortBy(exploreFilters);
      const url = useDiscover
        ? buildDiscoverExploreUrl({
            sortBy,
            genreId,
            moodId,
            filters: exploreFilters,
          })
        : "/api/tmdb/movie/now_playing?page=1";
      return fetchJson<{ results: TMDBMovie[] }>(url);
    },
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return { movies: query.data?.results ?? [], loading: query.isLoading };
}

export function useTrending() {
  const query = useQuery({
    queryKey: discoverKeys.trending(),
    queryFn: () => fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/trending/all/week"),
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return { movies: query.data?.results ?? [], loading: query.isLoading };
}

export function useTopRated() {
  const query = useQuery({
    queryKey: discoverKeys.topRated(),
    queryFn: () => fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/movie/top_rated?page=1"),
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return { movies: query.data?.results ?? [], loading: query.isLoading };
}

export function useSearchMulti(query: string) {
  const debouncedQuery = useDebouncedValue(query, 400);
  const normalizedQuery = debouncedQuery.trim();

  const searchQuery = useQuery({
    queryKey: discoverKeys.searchMulti(normalizedQuery),
    queryFn: () =>
      fetchJson<{ results: TMDBMovie[] }>(
        `/api/tmdb/search/multi?query=${encodeURIComponent(normalizedQuery)}&include_adult=false`
      ),
    enabled: normalizedQuery.length > 0,
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return {
    movies: normalizedQuery.length > 0 ? searchQuery.data?.results ?? [] : [],
    loading: normalizedQuery.length > 0 ? searchQuery.isLoading : false,
  };
}

export function usePopularTV() {
  const query = useQuery({
    queryKey: discoverKeys.popularTv(),
    queryFn: () => fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/tv/popular?page=1"),
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return { tvShows: query.data?.results ?? [], loading: query.isLoading };
}

export function useTopRatedTV() {
  const query = useQuery({
    queryKey: discoverKeys.topRatedTv(),
    queryFn: () => fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/tv/top_rated?page=1"),
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return { tvShows: query.data?.results ?? [], loading: query.isLoading };
}

export function useOnTheAirTV() {
  const query = useQuery({
    queryKey: discoverKeys.onTheAirTv(),
    queryFn: () => fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/tv/on_the_air?page=1"),
    staleTime: DISCOVER_STALE_TIME_MS,
  });

  return { tvShows: query.data?.results ?? [], loading: query.isLoading };
}
