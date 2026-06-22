import { adaptPostToFeedType } from "@/features/feed/api/adapters";
import { apiRequest } from "@/features/feed/api/http";
import type { Post } from "@/features/feed/types/feed";
import type { BookmarkFolderWithCount } from "../types";

export type BookmarksPage = {
  items: Post[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type BookmarkFoldersResponse = {
  folders: BookmarkFolderWithCount[];
  unsortedCount: number;
};

export async function fetchBookmarks(params: {
  cursor?: string;
  limit?: number;
  folderId?: string | null;
  token?: string | null;
}): Promise<BookmarksPage> {
  const query = new URLSearchParams({
    limit: String(params.limit ?? 20),
  });
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.folderId === null) {
    query.set("folderId", "none");
  } else if (params.folderId) {
    query.set("folderId", params.folderId);
  }

  const response = await apiRequest<{ items: unknown[]; nextCursor: string | null; hasMore: boolean }>(
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

export async function fetchBookmarkFolders(token: string | null): Promise<BookmarkFoldersResponse> {
  return apiRequest<BookmarkFoldersResponse>("/v1/feed/bookmarks/folders", { token });
}

export async function createBookmarkFolder(
  name: string,
  token: string | null
): Promise<BookmarkFolderWithCount> {
  const response = await apiRequest<{ folder: BookmarkFolderWithCount }>(
    "/v1/feed/bookmarks/folders",
    {
      method: "POST",
      token,
      body: { name },
    }
  );
  return response.folder;
}

export async function renameBookmarkFolder(
  folderId: string,
  name: string,
  token: string | null
): Promise<BookmarkFolderWithCount> {
  const response = await apiRequest<{ folder: BookmarkFolderWithCount }>(
    `/v1/feed/bookmarks/folders/${encodeURIComponent(folderId)}`,
    {
      method: "PATCH",
      token,
      body: { name },
    }
  );
  return response.folder;
}

export async function deleteBookmarkFolder(folderId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(
    `/v1/feed/bookmarks/folders/${encodeURIComponent(folderId)}`,
    {
      method: "DELETE",
      token,
    }
  );
}

export async function assignBookmarkFolder(
  postId: string,
  folderId: string | null,
  token: string | null
): Promise<{ folderId: string | null }> {
  return apiRequest<{ ok: true; folderId: string | null }>(
    `/v1/feed/posts/${encodeURIComponent(postId)}/bookmarks`,
    {
      method: "PATCH",
      token,
      body: { folderId },
    }
  );
}
