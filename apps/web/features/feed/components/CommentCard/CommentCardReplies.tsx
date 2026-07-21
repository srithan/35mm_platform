"use client";

import type { Comment, CommentCardProps } from "./types";
import { CommentCard } from "./CommentCard";
import { COMMENT_REPLY_PREVIEW_LIMIT } from "../../utils/commentReplyRanking";

interface CommentCardRepliesProps {
  replies: Comment[];
  postId: string;
  postBookmarked?: boolean;
  postBookmarkFolderId?: string | null;
  depth: number;
  expanded: boolean;
  onExpand: () => void;
  truncateText?: boolean;
  onReplySubmit?: CommentCardProps["onReplySubmit"];
}

export function CommentCardReplies({
  replies,
  postId,
  postBookmarked = false,
  postBookmarkFolderId = null,
  depth,
  expanded,
  onExpand,
  truncateText = true,
  onReplySubmit,
}: CommentCardRepliesProps) {
  const visibleReplies = expanded
    ? replies
    : replies.slice(0, COMMENT_REPLY_PREVIEW_LIMIT);
  const hiddenReplyCount = replies.length - visibleReplies.length;

  return (
    <div className="mt-1.5 -mx-1">
      {visibleReplies.map((reply) => (
        <CommentCard
          key={reply.id}
          comment={reply}
          postId={postId}
          postBookmarked={postBookmarked}
          postBookmarkFolderId={postBookmarkFolderId}
          depth={depth + 1}
          truncateText={truncateText}
          onReplySubmit={onReplySubmit}
        />
      ))}
      {hiddenReplyCount > 0 ? (
        <button
          type="button"
          className="ml-3 mt-1 rounded-md px-2 py-1 text-[12px] font-semibold text-fg-muted transition-colors hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          onClick={onExpand}
        >
          Show {hiddenReplyCount} more {hiddenReplyCount === 1 ? "reply" : "replies"}
        </button>
      ) : null}
    </div>
  );
}
