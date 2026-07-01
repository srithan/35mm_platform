"use client";

import { cn } from "@/lib/utils/cn";
import type { Comment, CommentCardProps } from "./types";
import { getCommentThreadStyles } from "./types";
import { CommentCardReplies } from "./CommentCardReplies";

interface CommentCardDeletedProps {
  comment: Comment;
  postId: string;
  postBookmarked?: boolean;
  postBookmarkFolderId?: string | null;
  depth: number;
  truncateText?: boolean;
  onReplySubmit?: CommentCardProps["onReplySubmit"];
}

export function CommentCardDeleted({
  comment,
  postId,
  postBookmarked = false,
  postBookmarkFolderId = null,
  depth,
  truncateText = true,
  onReplySubmit,
}: CommentCardDeletedProps) {
  const hasReplies = comment.replies && comment.replies.length > 0;
  const { containerStyle } = getCommentThreadStyles(depth);

  return (
    <div
      id={`comment-${comment.id}`}
      className={cn(
        "CommentCard w-full bg-bg px-4 py-4 animate-fade-up border-b border-border transition-colors duration-150 hover:bg-card-hover last:border-b-0",
        depth > 0 && "border-l-2 border-l-border"
      )}
      style={containerStyle}
    >
      <p className="text-[13px] italic text-fg-muted">This comment was deleted</p>
      {hasReplies ? (
        <CommentCardReplies
          replies={comment.replies!}
          postId={postId}
          postBookmarked={postBookmarked}
          postBookmarkFolderId={postBookmarkFolderId}
          depth={depth}
          expanded
          truncateText={truncateText}
          onReplySubmit={onReplySubmit}
        />
      ) : null}
    </div>
  );
}
