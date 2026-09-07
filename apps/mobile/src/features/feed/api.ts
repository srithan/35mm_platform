import type { ApiClient } from "@35mm/api-client";
import type { FeedPage, FeedPost } from "@35mm/types";

import { parseFeedPage } from "@/features/videos/contracts";
import { parseCommentPage, parseFeedPost, type CommentPage } from "./contracts";

export function fetchHomeFeedPage(
  client: ApiClient,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<FeedPage> {
  let query = new URLSearchParams({ limit: "20" });
  if (cursor) query.set("cursor", cursor);
  return client.request(`/v1/feed?${query.toString()}`, {
    auth: "required",
    operation: "feed.home",
    parser: parseFeedPage,
    ...(signal ? { signal } : {}),
  });
}

export function fetchPost(
  client: ApiClient,
  postId: string,
  signal?: AbortSignal,
): Promise<FeedPost> {
  return client.request(`/v1/feed/posts/${encodeURIComponent(postId)}`, {
    auth: "required",
    operation: "feed.post-detail",
    parser: parseFeedPost,
    ...(signal ? { signal } : {}),
  });
}

export function fetchCommentPage(
  client: ApiClient,
  postId: string,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<CommentPage> {
  let query = new URLSearchParams({ limit: "20" });
  if (cursor) query.set("cursor", cursor);
  return client.request(
    `/v1/feed/posts/${encodeURIComponent(postId)}/comments?${query.toString()}`,
    {
      auth: "required",
      operation: "feed.comments",
      parser: parseCommentPage,
      ...(signal ? { signal } : {}),
    },
  );
}
