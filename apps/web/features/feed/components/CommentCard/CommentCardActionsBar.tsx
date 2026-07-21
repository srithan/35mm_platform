"use client";

import { PostActions } from "@/components/PostActions/PostActions";
import { showGlobalFlashToast } from "@/components/FlashToast";
import { useLikeComment } from "../../hooks/useCommentMutations";
import { ApiRequestError } from "../../api/http";

interface CommentCardActionsBarProps {
  postId: string;
  commentId: string;
  likeCount: number;
  replyCount: number;
  liked?: boolean;
  depth: number;
  onCommentClick: () => void;
  onReplyClick: () => void;
}

export function CommentCardActionsBar({
  postId,
  commentId,
  likeCount,
  replyCount,
  liked,
  depth,
  onCommentClick,
  onReplyClick,
}: CommentCardActionsBarProps) {
  const likeCommentMutation = useLikeComment(postId);

  return (
    <PostActions
      likes={likeCount}
      comments={replyCount}
      reposts={0}
      hideZeroCounts
      useCompactVariant
      initialLiked={liked}
      onCommentClick={onCommentClick}
      onReplyClick={onReplyClick}
      onLikeToggle={({ isLiked }) => {
        likeCommentMutation.mutate(
          { commentId, isLiked },
          {
            onError: (error) => {
              const message =
                error instanceof ApiRequestError
                  ? error.message
                  : "Could not update comment like";
              showGlobalFlashToast(message, "error");
            },
          }
        );
      }}
      hideRepostSaveLabels
      showReplyOption={depth < 2}
    />
  );
}
