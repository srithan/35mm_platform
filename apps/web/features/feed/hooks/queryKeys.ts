import type { ProfileFeedKind, QuotePostSort } from "../api/feedApi";

export const feedKeys = {
  all: ["feed"] as const,
  filmReviews: (filmId: string | null, viewerId: string | null | undefined) =>
    ["feed", "film", filmId, "reviews", "viewer", viewerId ?? "guest"] as const,
  home: () => ["feed", "home"] as const,
  profile: (username: string, kind: ProfileFeedKind = "all") =>
    ["feed", "profile", username, kind] as const,
  quotes: (postId: string, sort: QuotePostSort = "latest") =>
    ["feed", "post", postId, "quotes", sort] as const,
  post: (postId: string) => ["feed", "post", postId] as const,
  postForViewer: (postId: string, viewerId: string | null | undefined) =>
    ["feed", "post", postId, "viewer", viewerId ?? "guest"] as const,
  postLike: (postId: string) => ["feed", "post", postId, "like"] as const,
  postBookmark: (postId: string) => ["feed", "post", postId, "bookmark"] as const,
  comments: (postId: string) => ["feed", "comments", postId] as const,
};
