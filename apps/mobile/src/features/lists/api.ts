import type { ApiClient } from "@35mm/api-client";
import type { FilmListDetail, FilmListPage } from "@35mm/types";

import { parseFilmListDetail, parseFilmListPage } from "./contracts";

export type PublicFilmListSort = "popular" | "recent";

export function fetchPublicListsPage(
  client: ApiClient,
  input: {
    readonly sort: PublicFilmListSort;
    readonly cursor: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<FilmListPage> {
  const query = new URLSearchParams({
    sort: input.sort,
    limit: "20",
  });
  if (input.cursor) query.set("cursor", input.cursor);
  return client.request(`/v1/lists?${query.toString()}`, {
    auth: "optional",
    operation: "lists.public-page",
    parser: parseFilmListPage,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}

export function fetchWatchlist(
  client: ApiClient,
  input: {
    readonly cursor: string | null;
    readonly signal?: AbortSignal;
  },
): Promise<FilmListDetail> {
  const query = new URLSearchParams({ limit: "24" });
  if (input.cursor) query.set("cursor", input.cursor);
  return client.request(`/v1/lists/me/watchlist?${query.toString()}`, {
    auth: "required",
    operation: "lists.watchlist",
    parser: parseFilmListDetail,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}
