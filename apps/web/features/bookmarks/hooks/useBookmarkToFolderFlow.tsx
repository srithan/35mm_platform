"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Bookmark } from "lucide-react";
import { BookmarkFolderPicker } from "@/components/PostActions/BookmarkFolderPicker";
import type { PortalDropdownItem } from "@/components/PortalDropdown/PortalDropdown";
import { useFlashToast } from "@/components/FlashToast";
import { ApiRequestError } from "@/features/feed/api/http";
import { useBookmarkPost } from "@/features/feed/hooks/usePostMutations";
import { useBookmarkFolders } from "./useBookmarkFolders";
import { useCreateBookmarkFolder } from "./useBookmarkFolderMutations";

function folderLabel(
  folderId: string | null,
  folders: Array<{ id: string; name: string }>
): string {
  if (folderId == null) return "All bookmarks";
  return (
    folders.find(function (folder) {
      return folder.id === folderId;
    })?.name ?? "folder"
  );
}

interface UseBookmarkToFolderFlowOptions {
  postId?: string;
  initialBookmarked?: boolean;
  initialBookmarkFolderId?: string | null;
  menuLabel?: string;
  menuDescription?: string;
}

export function useBookmarkToFolderFlow({
  postId,
  initialBookmarked = false,
  initialBookmarkFolderId = null,
  menuLabel = "Bookmark to folder",
  menuDescription,
}: UseBookmarkToFolderFlowOptions) {
  const { isLoaded, isSignedIn } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [folderId, setFolderId] = useState<string | null>(initialBookmarkFolderId ?? null);
  const bookmarkMutation = useBookmarkPost();
  const createFolderMutation = useCreateBookmarkFolder();
  const foldersQuery = useBookmarkFolders({ enabled: Boolean(postId) && isLoaded && Boolean(isSignedIn) });
  const { show: showFlashToast } = useFlashToast();
  const folders = foldersQuery.data?.folders ?? [];

  useEffect(function () {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  useEffect(function () {
    setFolderId(initialBookmarkFolderId ?? null);
  }, [initialBookmarkFolderId]);

  const openPicker = useCallback(function () {
    if (!postId) return;
    setPickerOpen(true);
  }, [postId]);

  const saveToFolder = useCallback(
    async function (targetFolderId: string | null) {
      if (!postId) return;
      setBookmarked(true);
      setFolderId(targetFolderId);
      try {
        await bookmarkMutation.mutateAsync({
          postId: postId,
          isBookmarked: true,
          folderId: targetFolderId,
        });
        showFlashToast(`Saved to ${folderLabel(targetFolderId, folders)}`);
      } catch (error) {
        const message =
          error instanceof ApiRequestError ? error.message : "Could not save to folder";
        showFlashToast(message, "error");
        setBookmarked(initialBookmarked);
        setFolderId(initialBookmarkFolderId ?? null);
        throw error;
      }
    },
    [
      postId,
      bookmarkMutation,
      folders,
      showFlashToast,
      initialBookmarked,
      initialBookmarkFolderId,
    ]
  );

  const createAndSave = useCallback(
    async function (name: string) {
      if (!postId) return;
      try {
        const folder = await createFolderMutation.mutateAsync(name);
        setBookmarked(true);
        setFolderId(folder.id);
        await bookmarkMutation.mutateAsync({
          postId: postId,
          isBookmarked: true,
          folderId: folder.id,
        });
        showFlashToast(`Saved to ${folder.name}`);
      } catch (error) {
        const message =
          error instanceof ApiRequestError ? error.message : "Could not save to folder";
        showFlashToast(message, "error");
        setBookmarked(initialBookmarked);
        setFolderId(initialBookmarkFolderId ?? null);
        throw error;
      }
    },
    [
      postId,
      createFolderMutation,
      bookmarkMutation,
      showFlashToast,
      initialBookmarked,
      initialBookmarkFolderId,
    ]
  );

  const resolvedLabel = bookmarked ? "Move to folder" : menuLabel;
  const resolvedDescription =
    menuDescription ??
    (bookmarked ? "Move saved post to a folder" : "Save this post into a folder");

  const menuItem: PortalDropdownItem | null =
    postId && isLoaded && isSignedIn
      ? {
          id: "bookmark-to-folder",
          label: resolvedLabel,
          description: resolvedDescription,
          icon: <Bookmark className="h-4 w-4" strokeWidth={1.8} />,
          onSelect: openPicker,
        }
      : null;

  const picker =
    postId && isLoaded && isSignedIn ? (
      <BookmarkFolderPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        bookmarked={bookmarked}
        folderId={folderId}
        folders={folders}
        foldersLoading={foldersQuery.isLoading}
        creatingFolder={createFolderMutation.isPending}
        onSelectFolder={saveToFolder}
        onCreateFolder={createAndSave}
      />
    ) : null;

  return {
    menuItem,
    picker,
  };
}
