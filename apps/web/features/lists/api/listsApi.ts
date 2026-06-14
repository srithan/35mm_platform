"use client";

import type { FilmListDetail, FilmListPage, FilmListSummary, WatchlistStatus } from "@35mm/types";
import { apiRequest } from "@/features/feed/api/http";
import { posterUrl, yearFromDate } from "@/features/discover/lib/tmdb-utils";
import type { TMDBMovie } from "@/lib/tmdb/types";
import type { FilmResult } from "@/features/feed/components/PostComposer/types";
import type { ShortFilm } from "@/features/short-films/data/mockShortFilms";

export type FilmListSort = "updated" | "popular" | "alpha";

export type TmdbFilmPayload = {
  tmdbId: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
};

export type CatalogFilmPayload = {
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  director?: string | null;
  overview?: string | null;
};

function yearNumber(value: string | undefined): number | null {
  if (!value) return null;
  var parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function tmdbMovieToFilmPayload(film: TMDBMovie): TmdbFilmPayload {
  return {
    tmdbId: film.id,
    title: film.title || film.name || "Untitled",
    year: yearNumber(yearFromDate(film.release_date || film.first_air_date || "")),
    posterUrl: posterUrl(film.poster_path),
    genres: [],
  };
}

export function filmResultToFilmPayload(film: FilmResult): TmdbFilmPayload {
  return {
    tmdbId: film.id,
    title: film.title,
    year: yearNumber(film.year),
    posterUrl: posterUrl(film.posterPath),
    genres: film.genres,
  };
}

export function shortFilmToCatalogPayload(film: ShortFilm): CatalogFilmPayload {
  return {
    title: film.title,
    year: film.year,
    posterUrl: film.posterSrc,
    genres: [film.category],
    director: film.director,
    overview: film.synopsis,
  };
}

export async function fetchProfileLists(params: {
  username: string;
  sort?: FilmListSort;
  cursor?: string;
  token?: string | null;
}): Promise<FilmListPage> {
  var query = new URLSearchParams({
    sort: params.sort ?? "updated",
    limit: "20",
  });
  if (params.cursor) query.set("cursor", params.cursor);
  return apiRequest<FilmListPage>(
    `/v1/lists/profile/${encodeURIComponent(params.username)}?${query.toString()}`,
    { token: params.token }
  );
}

export async function fetchList(listId: string, token?: string | null): Promise<FilmListDetail> {
  return apiRequest<FilmListDetail>(`/v1/lists/${encodeURIComponent(listId)}`, { token });
}

export async function createFilmList(
  input: {
    title: string;
    description?: string | null;
    visibility: "public" | "private";
    isRanked: boolean;
    tags: string[];
  },
  token?: string | null
): Promise<FilmListSummary> {
  return apiRequest<FilmListSummary>("/v1/lists", { method: "POST", token, body: input });
}

export async function updateFilmList(
  listId: string,
  input: Partial<{
    title: string;
    description: string | null;
    visibility: "public" | "private";
    isRanked: boolean;
    tags: string[];
  }>,
  token?: string | null
): Promise<FilmListSummary> {
  return apiRequest<FilmListSummary>(`/v1/lists/${encodeURIComponent(listId)}`, {
    method: "PATCH",
    token,
    body: input,
  });
}

export async function deleteFilmList(listId: string, token?: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/lists/${encodeURIComponent(listId)}`, {
    method: "DELETE",
    token,
  });
}

export async function addFilmToList(
  listId: string,
  input: {
    film?: TmdbFilmPayload;
    catalogFilm?: CatalogFilmPayload;
    filmId?: string;
    note?: string | null;
    position?: number | null;
  },
  token?: string | null
): Promise<{ ok: true; entryId: string | null; filmId: string; duplicate: boolean }> {
  return apiRequest<{ ok: true; entryId: string | null; filmId: string; duplicate: boolean }>(
    `/v1/lists/${encodeURIComponent(listId)}/entries`,
    { method: "POST", token, body: input }
  );
}

export async function updateListEntry(
  listId: string,
  entryId: string,
  input: { note?: string | null; position?: number | null },
  token?: string | null
): Promise<void> {
  await apiRequest<{ ok: true }>(
    `/v1/lists/${encodeURIComponent(listId)}/entries/${encodeURIComponent(entryId)}`,
    { method: "PATCH", token, body: input }
  );
}

export async function removeListEntry(
  listId: string,
  entryId: string,
  token?: string | null
): Promise<void> {
  await apiRequest<{ ok: true }>(
    `/v1/lists/${encodeURIComponent(listId)}/entries/${encodeURIComponent(entryId)}`,
    { method: "DELETE", token }
  );
}

export async function reorderListEntries(
  listId: string,
  entries: Array<{ entryId: string; position: number }>,
  token?: string | null
): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/lists/${encodeURIComponent(listId)}/entries/reorder`, {
    method: "PATCH",
    token,
    body: { entries },
  });
}

export async function addToWatchlist(
  input: { film?: TmdbFilmPayload; catalogFilm?: CatalogFilmPayload; filmId?: string },
  token?: string | null
): Promise<WatchlistStatus> {
  return apiRequest<WatchlistStatus>("/v1/lists/watchlist/films", {
    method: "POST",
    token,
    body: input,
  });
}

export async function resolveFilmForLists(
  input: { film?: TmdbFilmPayload; catalogFilm?: CatalogFilmPayload; filmId?: string },
  token?: string | null
): Promise<{ filmId: string }> {
  return apiRequest<{ filmId: string }>("/v1/lists/films/resolve", {
    method: "POST",
    token,
    body: input,
  });
}

export async function removeFromWatchlist(filmId: string, token?: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/lists/watchlist/films/${encodeURIComponent(filmId)}`, {
    method: "DELETE",
    token,
  });
}

export async function likeFilmList(listId: string, token?: string | null): Promise<{ ok: true; isLiked: true }> {
  return apiRequest<{ ok: true; isLiked: true }>(`/v1/lists/${encodeURIComponent(listId)}/like`, {
    method: "POST",
    token,
  });
}

export async function unlikeFilmList(listId: string, token?: string | null): Promise<{ ok: true; isLiked: false }> {
  return apiRequest<{ ok: true; isLiked: false }>(`/v1/lists/${encodeURIComponent(listId)}/like`, {
    method: "DELETE",
    token,
  });
}

export async function cloneFilmList(
  listId: string,
  input: { title?: string; visibility?: "public" | "private" } | undefined,
  token?: string | null
): Promise<FilmListSummary> {
  return apiRequest<FilmListSummary>(`/v1/lists/${encodeURIComponent(listId)}/clone`, {
    method: "POST",
    token,
    body: input ?? {},
  });
}
