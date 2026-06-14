"use client";

import { cn } from "@/lib/utils/cn";
import type { Comment, CommentCardProps } from "./types";
import { getCommentThreadStyles } from "./types";
import { CommentCardReplies } from "./CommentCardReplies";

interface CommentCardDeletedProps {
  comment: Comment;
  postId: string;
  depth: number;
  onReplySubmit?: CommentCardProps["onReplySubmit"];
}

export function CommentCardDeleted({
  comment,
  postId,
  depth,
  onReplySubmit,
}: CommentCardDeletedProps) {
  const hasReplies = comment.replies && comment.replies.length > 0;
  const { containerStyle } = getCommentThreadStyles(depth);

  return (
    <div
      id={`comment-${comment.id}`}
      className={cn(
        "CommentCard w-full px-4 py-4 animate-fade-up border-b border-border last:border-b-0",
        depth > 0 && "border-l-2 border-l-border"
      )}
      style={{
        backgroundColor: "var(--color-bg)",
        ...containerStyle,
      }}
    >
      <p className="text-[13px] italic text-fg-muted">This comment was deleted</p>
      {hasReplies ? (
        <CommentCardReplies
          replies={comment.replies!}
          postId={postId}
          depth={depth}
          expanded
          onReplySubmit={onReplySubmit}
        />
      ) : null}
    </div>
  );
}
