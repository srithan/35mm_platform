"use client";

import { useState, useEffect } from "react";
import type { TMDBMovie, TMDBGenre } from "@/lib/tmdb/types";
import type { DiscoverMoodId } from "../lib/discoverMoodFilters";
import {
  buildDiscoverExploreUrl,
  shouldUseDiscoverList,
  discoverRecentSortBy,
  type DiscoverExploreFiltersState,
} from "../lib/discoverExploreFilters";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`);
  return res.json();
}

export function useGenres() {
  const [genres, setGenres] = useState<TMDBGenre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ genres: TMDBGenre[] }>("/api/tmdb/genre/movie/list")
      .then((data) => setGenres(data.genres))
      .catch(() => setGenres([]))
      .finally(() => setLoading(false));
  }, []);

  return { genres, loading };
}

export function usePopular(
  genreId: number | null,
  moodId: DiscoverMoodId,
  exploreFilters: DiscoverExploreFiltersState
) {
  const [data, setData] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const useDiscover = shouldUseDiscoverList(genreId, moodId, exploreFilters);
    const url = useDiscover
      ? buildDiscoverExploreUrl({
          sortBy: "popularity.desc",
          genreId,
          moodId,
          filters: exploreFilters,
        })
      : "/api/tmdb/movie/popular?page=1";
    fetchJson<{ results: TMDBMovie[] }>(url)
      .then((d) => setData(d.results || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [genreId, moodId, exploreFilters]);

  return { movies: data, loading };
}

export function useNowPlaying(
  genreId: number | null,
  moodId: DiscoverMoodId,
  exploreFilters: DiscoverExploreFiltersState
) {
  const [data, setData] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const useDiscover = shouldUseDiscoverList(genreId, moodId, exploreFilters);
    const sortBy = discoverRecentSortBy(exploreFilters);
    const url = useDiscover
      ? buildDiscoverExploreUrl({
          sortBy: sortBy,
          genreId,
          moodId,
          filters: exploreFilters,
        })
      : "/api/tmdb/movie/now_playing?page=1";
    fetchJson<{ results: TMDBMovie[] }>(url)
      .then((d) => setData(d.results || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [genreId, moodId, exploreFilters]);

  return { movies: data, loading };
}

export function useTrending() {
  const [data, setData] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/trending/all/week")
      .then((d) => setData(d.results || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { movies: data, loading };
}

export function useTopRated() {
  const [data, setData] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/movie/top_rated?page=1")
      .then((d) => setData(d.results || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { movies: data, loading };
}

export function useSearchMulti(query: string) {
  const [data, setData] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setData([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      const url = `/api/tmdb/search/multi?query=${encodeURIComponent(query.trim())}&include_adult=false`;
      fetchJson<{ results: TMDBMovie[] }>(url)
        .then((d) => setData(d.results || []))
        .catch(() => setData([]))
        .finally(() => setLoading(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return { movies: data, loading };
}

export function usePopularTV() {
  const [data, setData] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/tv/popular?page=1")
      .then((d) => setData(d.results || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { tvShows: data, loading };
}

export function useTopRatedTV() {
  const [data, setData] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/tv/top_rated?page=1")
      .then((d) => setData(d.results || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { tvShows: data, loading };
}

export function useOnTheAirTV() {
  const [data, setData] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ results: TMDBMovie[] }>("/api/tmdb/tv/on_the_air?page=1")
      .then((d) => setData(d.results || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return { tvShows: data, loading };
}
