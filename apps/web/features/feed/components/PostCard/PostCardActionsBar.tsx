"use client";

import { useIsMutating } from "@tanstack/react-query";
import { PostActions } from "@/components/PostActions/PostActions";
import { useFlashToast } from "@/components/FlashToast";
import {
  useBookmarkPost,
  useLikePost,
  useRepostPost,
} from "../../hooks/usePostMutations";
import { ApiRequestError } from "../../api/http";
import { useBookmarkFolders } from "@/features/bookmarks/hooks/useBookmarkFolders";
import { useCreateBookmarkFolder } from "@/features/bookmarks/hooks/useBookmarkFolderMutations";
import { feedKeys } from "../../hooks/queryKeys";

interface PostCardActionsBarProps {
  postId?: string;
  likeCount: number;
  commentCount: number;
  initialLiked: boolean;
  initialBookmarked: boolean;
  initialBookmarkFolderId?: string | null;
  initialReposted: boolean;
  onCommentClick?: () => void;
}

type BookmarkFolderSelectState = {
  folderId: string | null;
  revert: () => void;
};

type BookmarkToggleState = {
  isBookmarked: boolean;
  revert: () => void;
};

type LikeToggleState = {
  isLiked: boolean;
  revert: () => void;
};

function folderLabel(
  folderId: string | null,
  folders: Array<{ id: string; name: string }>
): string {
  if (folderId == null) return "All bookmarks";
  return folders.find(function (folder) {
    return folder.id === folderId;
  })?.name ?? "folder";
}

export function PostCardActionsBar({
  postId,
  likeCount,
  commentCount,
  initialLiked,
  initialBookmarked,
  initialBookmarkFolderId = null,
  initialReposted,
  onCommentClick,
}: PostCardActionsBarProps) {
  const likeMutation = useLikePost(postId);
  const repostMutation = useRepostPost();
  const bookmarkMutation = useBookmarkPost(postId);
  const createFolderMutation = useCreateBookmarkFolder();
  const foldersQuery = useBookmarkFolders({ enabled: Boolean(postId) });
  const { show: showFlashToast } = useFlashToast();
  const folders = foldersQuery.data?.folders ?? [];
  const likePendingCount = useIsMutating({
    mutationKey: feedKeys.postLike(postId ?? "unknown"),
  });
  const likeDisabled = likePendingCount > 0;
  const bookmarkPendingCount = useIsMutating({
    mutationKey: feedKeys.postBookmark(postId ?? "unknown"),
  });
  const bookmarkDisabled = bookmarkPendingCount > 0;

  async function saveToFolder(state: BookmarkFolderSelectState) {
    if (!postId || bookmarkDisabled) {
      state.revert();
      return;
    }
    try {
      await bookmarkMutation.mutateAsync({
        postId,
        isBookmarked: true,
        folderId: state.folderId,
      });
      showFlashToast(`Saved to ${folderLabel(state.folderId, folders)}`);
    } catch (error) {
      state.revert();
      const message = error instanceof ApiRequestError ? error.message : "Could not save to folder";
      showFlashToast(message, "error");
      throw error;
    }
  }

  return (
    <PostActions
      likes={likeCount}
      comments={commentCount}
      hideZeroCounts
      useCompactVariant
      initialLiked={initialLiked}
      initialBookmarked={initialBookmarked}
      initialBookmarkFolderId={initialBookmarkFolderId}
      initialReposted={initialReposted}
      onCommentClick={onCommentClick}
      bookmarkFolders={folders}
      bookmarkFoldersLoading={foldersQuery.isLoading}
      creatingBookmarkFolder={createFolderMutation.isPending}
      likeDisabled={likeDisabled}
      bookmarkDisabled={bookmarkDisabled}
      onLikeToggle={(state: LikeToggleState) => {
        if (!postId || likeDisabled) {
          state.revert();
          return;
        }
        likeMutation.mutate(
          { postId, isLiked: state.isLiked },
          {
            onError: (error) => {
              state.revert();
              const message =
                error instanceof ApiRequestError ? error.message : "Could not update like";
              showFlashToast(message, "error");
            },
          }
        );
      }}
      onRepostToggle={({ isReposted }) => {
        if (!postId) return;
        repostMutation.mutate(
          { postId, isReposted },
          {
            onError: (error) => {
              const message =
                error instanceof ApiRequestError ? error.message : "Could not update repost";
              showFlashToast(message, "error");
            },
          }
        );
      }}
      onBookmarkToggle={(state: BookmarkToggleState) => {
        if (!postId || bookmarkDisabled) {
          state.revert();
          return;
        }
        bookmarkMutation.mutate(
          { postId, isBookmarked: state.isBookmarked },
          {
            onSuccess: () => {
              showFlashToast(
                state.isBookmarked ? "Saved to bookmarks" : "Removed from bookmarks"
              );
            },
            onError: (error) => {
              state.revert();
              const message =
                error instanceof ApiRequestError ? error.message : "Could not update bookmark";
              showFlashToast(message, "error");
            },
          }
        );
      }}
      onBookmarkFolderSelect={saveToFolder}
      onCreateBookmarkFolder={async function (name) {
        if (!postId || bookmarkDisabled) return undefined;
        try {
          const folder = await createFolderMutation.mutateAsync(name);
          await bookmarkMutation.mutateAsync({ postId, isBookmarked: true, folderId: folder.id });
          showFlashToast(`Saved to ${folder.name}`);
          return folder;
        } catch (error) {
          const message =
            error instanceof ApiRequestError ? error.message : "Could not save to folder";
          showFlashToast(message, "error");
          throw error;
        }
      }}
    />
  );
}
