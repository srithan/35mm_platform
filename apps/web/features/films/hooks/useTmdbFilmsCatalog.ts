"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { FilmCatalogFilters } from "../api/filmsApi";
import { fetchTmdbFilmsCatalog } from "../api/tmdbFilmsApi";

export function useTmdbFilmsCatalog(filters: FilmCatalogFilters) {
  return useInfiniteQuery({
    queryKey: ["film-catalog", "tmdb", filters],
    queryFn: function ({ pageParam }) {
      return fetchTmdbFilmsCatalog(filters, pageParam as number);
    },
    initialPageParam: 1,
    getNextPageParam: function (lastPage) {
      return lastPage.nextPage ?? undefined;
    },
    staleTime: 15 * 60_000,
  });
}
