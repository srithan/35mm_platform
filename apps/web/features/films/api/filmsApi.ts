"use client";

import type {
  FilmCatalogItem,
  FilmCatalogPage,
  FilmCatalogSort,
  FilmCatalogType,
} from "@35mm/types";
import { apiRequest } from "@/features/feed/api/http";

export type FilmCatalogFilters = {
  q: string;
  sort: FilmCatalogSort;
  mood: string;
  type: FilmCatalogType;
  genre: string;
  decade: string;
  language: string;
  duration: string;
};

export type FilmCatalogDisplayItem = FilmCatalogItem & {
  source: "35mm" | "tmdb";
};

export async function fetchFilmsCatalog(
  filters: FilmCatalogFilters,
  cursor?: string
): Promise<FilmCatalogPage> {
  var query = new URLSearchParams({ limit: "48" });
  if (filters.sort !== "popular") query.set("sort", filters.sort);
  if (filters.q) query.set("q", filters.q);
  if (filters.mood !== "all") query.set("mood", filters.mood);
  if (filters.type !== "all") query.set("type", filters.type);
  if (filters.genre) query.set("genre", filters.genre);
  if (filters.decade) query.set("decade", filters.decade);
  if (filters.language) query.set("language", filters.language);
  if (filters.duration !== "any") query.set("duration", filters.duration);
  if (cursor) query.set("cursor", cursor);
  return apiRequest<FilmCatalogPage>(`/v1/films?${query.toString()}`);
}

export async function resolveTmdbFilm(
  film: {
    tmdbId: number;
    title: string;
    year: number | null;
    posterUrl: string | null;
    genres: string[];
    runtime?: number | null;
    language?: string | null;
    country?: string | null;
  },
  token?: string | null
): Promise<{ filmId: string }> {
  return apiRequest<{ filmId: string }>("/v1/films/resolve", {
    method: "POST",
    token,
    body: film,
  });
}
