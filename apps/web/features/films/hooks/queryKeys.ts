import type { FilmCatalogFilters } from "../api/filmsApi";

export const filmCatalogKeys = {
  all: ["film-catalog"] as const,
  browse: (filters: FilmCatalogFilters) => ["film-catalog", "browse", filters] as const,
};
