import type { ApiClient } from "@35mm/api-client";

import {
  parseBookmarkAssignment,
  parseBookmarkFoldersResponse,
  parseBookmarkPage,
  parseFolderMutation,
  parseMutationOk,
  type BookmarkFoldersResponse,
  type BookmarkPage,
  type BookmarkFolder,
} from "./contracts";
import type { BookmarkFilterId } from "./queryKeys";

export function fetchBookmarkFolders(
  client: ApiClient,
  signal?: AbortSignal,
): Promise<BookmarkFoldersResponse> {
  return client.request("/v1/feed/bookmarks/folders", {
    auth: "required",
    operation: "bookmarks.folders",
    parser: parseBookmarkFoldersResponse,
    ...(signal ? { signal } : {}),
  });
}

export function fetchBookmarksPage(
  client: ApiClient,
  input: {
    readonly cursor: string | null;
    readonly folderId: BookmarkFilterId;
    readonly signal?: AbortSignal;
  },
): Promise<BookmarkPage> {
  const query = new URLSearchParams({ limit: "20" });
  if (input.cursor) query.set("cursor", input.cursor);
  if (input.folderId === null) {
    query.set("folderId", "none");
  } else if (typeof input.folderId === "string") {
    query.set("folderId", input.folderId);
  }
  return client.request(`/v1/feed/bookmarks?${query.toString()}`, {
    auth: "required",
    operation: "bookmarks.page",
    parser: parseBookmarkPage,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}

export function createBookmarkFolder(
  client: ApiClient,
  name: string,
): Promise<BookmarkFolder> {
  return client.request("/v1/feed/bookmarks/folders", {
    method: "POST",
    auth: "required",
    body: { name },
    operation: "bookmarks.folder-create",
    parser: (value) => parseFolderMutation(value).folder,
    requestClass: "mutation",
  });
}

export function renameBookmarkFolder(
  client: ApiClient,
  folderId: string,
  name: string,
): Promise<BookmarkFolder> {
  return client.request(`/v1/feed/bookmarks/folders/${encodeURIComponent(folderId)}`, {
    method: "PATCH",
    auth: "required",
    body: { name },
    operation: "bookmarks.folder-rename",
    parser: (value) => parseFolderMutation(value).folder,
    requestClass: "mutation",
  });
}

export function deleteBookmarkFolder(
  client: ApiClient,
  folderId: string,
): Promise<{ readonly ok: true }> {
  return client.request(`/v1/feed/bookmarks/folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE",
    auth: "required",
    operation: "bookmarks.folder-delete",
    parser: parseMutationOk,
    requestClass: "mutation",
  });
}

export function assignBookmarkFolder(
  client: ApiClient,
  postId: string,
  folderId: string | null,
) {
  return client.request(`/v1/feed/posts/${encodeURIComponent(postId)}/bookmarks`, {
    method: "PATCH",
    auth: "required",
    body: { folderId },
    operation: "bookmarks.assign-folder",
    parser: parseBookmarkAssignment,
    requestClass: "mutation",
  });
}

export function removeBookmark(
  client: ApiClient,
  postId: string,
) {
  return client.request(`/v1/feed/posts/${encodeURIComponent(postId)}/bookmarks`, {
    method: "DELETE",
    auth: "required",
    operation: "bookmarks.remove",
    parser: parseBookmarkAssignment,
    requestClass: "mutation",
  });
}
