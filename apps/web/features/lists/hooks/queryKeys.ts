export const listKeys = {
  all: ["film-lists"] as const,
  profile: (username: string, sort: string) => ["film-lists", "profile", username, sort] as const,
  detail: (listId: string) => ["film-lists", "detail", listId] as const,
  watchlist: ["film-lists", "watchlist"] as const,
};
