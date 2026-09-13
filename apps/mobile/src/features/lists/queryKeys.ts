import type { PublicFilmListSort } from "./api";

export const listKeys = {
  all: ["film-lists"] as const,
  public: (sort: PublicFilmListSort) => [...listKeys.all, "public", { sort }] as const,
  detail: (listId: string) => [...listKeys.all, "detail", listId] as const,
  watchlist: () => [...listKeys.all, "watchlist"] as const,
};
