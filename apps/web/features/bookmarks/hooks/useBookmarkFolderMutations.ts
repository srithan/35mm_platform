"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignBookmarkFolder,
  createBookmarkFolder,
  deleteBookmarkFolder,
  renameBookmarkFolder,
} from "../api/bookmarksApi";
import { bookmarkKeys } from "./queryKeys";
import { bookmarkPost } from "@/features/feed/api/postsApi";

export function useCreateBookmarkFolder() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (name: string) {
      return createBookmarkFolder(name, await getToken());
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.folders() });
    },
  });
}

export function useRenameBookmarkFolder() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: { folderId: string; name: string }) {
      return renameBookmarkFolder(input.folderId, input.name, await getToken());
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.folders() });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });
}

export function useDeleteBookmarkFolder() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (folderId: string) {
      return deleteBookmarkFolder(folderId, await getToken());
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.folders() });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });
}

export function useAssignBookmarkFolder() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async function (input: {
      postId: string;
      folderId: string | null;
      isBookmarked: boolean;
    }) {
      const token = await getToken();
      if (!input.isBookmarked) {
        await bookmarkPost(input.postId, token, input.folderId);
        return { folderId: input.folderId };
      }
      return assignBookmarkFolder(input.postId, input.folderId, token);
    },
    onSuccess: function () {
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.folders() });
      queryClient.invalidateQueries({ queryKey: bookmarkKeys.all });
    },
  });
}
