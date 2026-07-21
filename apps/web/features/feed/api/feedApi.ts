import type { FeedPage, Post } from "../types/feed";
import { adaptPostToFeedType } from "./adapters";
import { apiRequest } from "./http";

export type ProfileFeedKind = "all" | "reposts";

export interface FetchFeedParams {
  cursor?: string;
  limit?: number;
  username?: string;
  profileFeedKind?: ProfileFeedKind;
  token?: string | null;
}

export async function fetchFeed(params: FetchFeedParams): Promise<FeedPage> {
  const limit = params.limit ?? 20;
  const query = new URLSearchParams({ limit: String(limit) });
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.username && params.profileFeedKind === "reposts") {
    query.set("kind", "reposts");
  }
  const path = params.username
    ? `/v1/feed/profiles/${encodeURIComponent(params.username)}/posts?${query.toString()}`
    : `/v1/feed?${query.toString()}`;
  const page = await apiRequest<{ items: unknown[]; nextCursor: string | null; hasMore: boolean }>(
    path,
    { token: params.token }
  );

  return {
    posts: page.items.map((item): Post =>
      adaptPostToFeedType(item as Parameters<typeof adaptPostToFeedType>[0])
    ),
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  };
}
