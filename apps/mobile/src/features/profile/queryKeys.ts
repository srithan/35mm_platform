export type ProfileFeedKind = "posts" | "reposts";
export type ProfileConnectionsKind = "followers" | "following";

export const profileKeys = {
  all: ["profiles"] as const,
  detail: (username: string) => [...profileKeys.all, "detail", username.toLowerCase()] as const,
  feeds: (username: string) => [...profileKeys.detail(username), "feed"] as const,
  feed: (username: string, kind: ProfileFeedKind) => [...profileKeys.feeds(username), kind] as const,
  stats: (username: string) => [...profileKeys.detail(username), "stats"] as const,
  lists: (username: string) => [...profileKeys.detail(username), "lists"] as const,
  connections: (username: string, kind: ProfileConnectionsKind) =>
    [...profileKeys.detail(username), "connections", kind] as const,
};
