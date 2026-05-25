import { adaptPostToFeedType } from "@/features/feed/api/adapters";
import { apiRequest } from "@/features/feed/api/http";
import type { Post } from "@/features/feed/types/feed";

export type BookmarksPage = {
  items: Post[];
  nextCursor: string | null;
  hasMore: boolean;
};

export async function fetchBookmarks(params: {
  cursor?: string;
  limit?: number;
  token?: string | null;
}): Promise<BookmarksPage> {
  var query = new URLSearchParams({
    limit: String(params.limit ?? 20),
  });
  if (params.cursor) query.set("cursor", params.cursor);

  var response = await apiRequest<{ items: unknown[]; nextCursor: string | null; hasMore: boolean }>(
    `/v1/feed/bookmarks?${query.toString()}`,
    { token: params.token }
  );

  return {
    items: response.items.map((item) =>
      adaptPostToFeedType(item as Parameters<typeof adaptPostToFeedType>[0])
    ),
    nextCursor: response.nextCursor,
    hasMore: response.hasMore,
  };
}
