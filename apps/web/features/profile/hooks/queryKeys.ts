export const profileKeys = {
  all: ["profiles"] as const,
  detail: (username: string) => ["profiles", "detail", username] as const,
  stats: (username: string) => ["profiles", "stats", username] as const,
  followers: (username: string) => ["profiles", "followers", username] as const,
  following: (username: string) => ["profiles", "following", username] as const,
  followRequests: (username: string) => ["profiles", "follow-requests", username] as const,
};
