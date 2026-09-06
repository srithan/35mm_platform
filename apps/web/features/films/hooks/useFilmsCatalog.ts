"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchFilmsCatalog, type FilmCatalogFilters } from "../api/filmsApi";
import { filmCatalogKeys } from "./queryKeys";

export function useFilmsCatalog(filters: FilmCatalogFilters) {
  return useInfiniteQuery({
    queryKey: filmCatalogKeys.browse(filters),
    queryFn: function ({ pageParam }) {
      return fetchFilmsCatalog(filters, pageParam as string | undefined);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: function (lastPage) {
      return lastPage.nextCursor ?? undefined;
    },
    staleTime: 60_000,
  });
}
