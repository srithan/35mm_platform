"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  apiCreateFolder,
  apiDeleteFolder,
  apiMoveBookmark,
  apiRemoveBookmark,
  apiRenameFolder,
  fetchBookmarkFoldersWithCounts,
  fetchBookmarkItems,
  searchBookmarks,
} from "../api/bookmarksApi";
import { bookmarkKeys } from "./queryKeys";

export function useBookmarkFoldersQuery() {
  return useQuery({
    queryKey: bookmarkKeys.folders(),
    queryFn: fetchBookmarkFoldersWithCounts,
    staleTime: 15_000,
  });
}

export function useBookmarkItemsQuery(
  folderId: string | null,
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled !== false;
  return useQuery({
    queryKey: bookmarkKeys.items(folderId),
    queryFn: () => fetchBookmarkItems(folderId),
    staleTime: 15_000,
    enabled,
  });
}

export function useBookmarkSearchQuery(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: bookmarkKeys.search(q),
    queryFn: () => searchBookmarks(q),
    enabled: q.length > 0,
    staleTime: 10_000,
  });
}

function invalidateAllBookmarks(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: bookmarkKeys.all });
}

export function useCreateBookmarkFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiCreateFolder(name),
    onSuccess: () => invalidateAllBookmarks(qc),
  });
}

export function useRenameBookmarkFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { folderId: string; name: string }) =>
      apiRenameFolder(p.folderId, p.name),
    onSuccess: () => invalidateAllBookmarks(qc),
  });
}

export function useDeleteBookmarkFolderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) => apiDeleteFolder(folderId),
    onSuccess: () => invalidateAllBookmarks(qc),
  });
}

export function useMoveBookmarkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { bookmarkId: string; targetFolderId: string }) =>
      apiMoveBookmark(p.bookmarkId, p.targetFolderId),
    onSuccess: () => invalidateAllBookmarks(qc),
  });
}

export function useRemoveBookmarkMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookmarkId: string) => apiRemoveBookmark(bookmarkId),
    onSuccess: () => invalidateAllBookmarks(qc),
  });
}
