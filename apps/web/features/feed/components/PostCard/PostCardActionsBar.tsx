"use client";

import { PostActions } from "@/components/PostActions/PostActions";
import { useFlashToast } from "@/components/FlashToast";
import {
  useBookmarkPost,
  useLikePost,
  useRepostPost,
} from "../../hooks/usePostMutations";
import { ApiRequestError } from "../../api/http";

interface PostCardActionsBarProps {
  postId?: string;
  likeCount: number;
  commentCount: number;
  initialLiked: boolean;
  initialBookmarked: boolean;
  initialReposted: boolean;
  onCommentClick?: () => void;
}

export function PostCardActionsBar({
  postId,
  likeCount,
  commentCount,
  initialLiked,
  initialBookmarked,
  initialReposted,
  onCommentClick,
}: PostCardActionsBarProps) {
  const likeMutation = useLikePost();
  const repostMutation = useRepostPost();
  const bookmarkMutation = useBookmarkPost();
  const { show: showFlashToast } = useFlashToast();

  return (
    <PostActions
      likes={likeCount}
      comments={commentCount}
      hideZeroCounts
      useCompactVariant
      initialLiked={initialLiked}
      initialBookmarked={initialBookmarked}
      initialReposted={initialReposted}
      onCommentClick={onCommentClick}
      onLikeToggle={({ isLiked }) => {
        if (!postId) return;
        likeMutation.mutate(
          { postId, isLiked },
          {
            onError: (error) => {
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
      onBookmarkToggle={({ isBookmarked }) => {
        if (!postId) return;
        bookmarkMutation.mutate(
          { postId, isBookmarked },
          {
            onError: (error) => {
              const message =
                error instanceof ApiRequestError ? error.message : "Could not update bookmark";
              showFlashToast(message, "error");
            },
          }
        );
      }}
    />
  );
}
