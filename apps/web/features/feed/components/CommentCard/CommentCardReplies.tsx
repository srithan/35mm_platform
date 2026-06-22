"use client";

import type { Comment, CommentCardProps } from "./types";
import { CommentCard } from "./CommentCard";

interface CommentCardRepliesProps {
  replies: Comment[];
  postId: string;
  postBookmarked?: boolean;
  postBookmarkFolderId?: string | null;
  depth: number;
  expanded: boolean;
  onReplySubmit?: CommentCardProps["onReplySubmit"];
}

export function CommentCardReplies({
  replies,
  postId,
  postBookmarked = false,
  postBookmarkFolderId = null,
  depth,
  expanded,
  onReplySubmit,
}: CommentCardRepliesProps) {
  if (!expanded) return null;

  return (
    <div className="mt-1.5 -mx-1">
      {replies.map((reply) => (
        <CommentCard
          key={reply.id}
          comment={reply}
          postId={postId}
          postBookmarked={postBookmarked}
          postBookmarkFolderId={postBookmarkFolderId}
          depth={depth + 1}
          onReplySubmit={onReplySubmit}
        />
      ))}
    </div>
  );
}
