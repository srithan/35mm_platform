"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { hasVisibleRichText } from "@/lib/utils/richContent";
import { EmptyState } from "@/components/EmptyState";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useCreateComment } from "../hooks/useCommentMutations";
import { CommentCard, type Comment as CommentCardType } from "./CommentCard";
import {
  ReplyComposerPanel,
  ReplyComposerTrigger,
} from "./ReplyComposer/ReplyComposerPanel";
import type { Comment as FeedComment } from "../types/feed";

interface CommentSectionProps {
  comments: FeedComment[];
  isLoading?: boolean;
  postId: string;
  postUsername?: string;
  postBookmarked?: boolean;
  postBookmarkFolderId?: string | null;
  className?: string;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
}

function formatCommentTime(value: string): string {
  var then = Date.parse(value);
  if (Number.isNaN(then)) return "now";
  var diff = Date.now() - then;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function toCommentCard(comment: FeedComment): CommentCardType {
  return {
    id: comment.id,
    parentId: comment.parentId,
    isDeleted: comment.isDeleted,
    authorId: comment.author.id,
    username: comment.author.username,
    displayName: comment.author.displayName,
    avatarUrl: comment.author.avatarUrl,
    avatarInitial: comment.author.displayName.charAt(0).toUpperCase() || "U",
    text: comment.body ?? "",
    timestamp: formatCommentTime(comment.createdAt),
    likeCount: comment.likeCount,
    liked: comment.isLiked,
    replyCount: comment.replies.length,
    role: comment.author.role,
    roleContext: comment.author.roleContext,
    filmsLoggedCount: comment.author.filmsLoggedCount,
    replies: comment.replies.map(toCommentCard),
  };
}

export function CommentSection({
  comments,
  isLoading = false,
  postId,
  postUsername,
  postBookmarked = false,
  postBookmarkFolderId = null,
  className,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
}: CommentSectionProps) {
  const [isComposerActive, setIsComposerActive] = useState(false);
  const [replyText, setReplyText] = useState("");
  const createCommentMutation = useCreateComment(postId);
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const currentInitial = initialForName(currentUser?.displayName ?? currentUser?.username);
  const normalizedComments: CommentCardType[] = comments.map(toCommentCard);

  const handleActivateComposer = () => {
    setIsComposerActive(true);
  };

  const handleCancelComposer = () => {
    setIsComposerActive(false);
    setReplyText("");
  };

  const handleReplySubmit = async () => {
    if (!hasVisibleRichText(replyText) || createCommentMutation.isPending) return;

    try {
      var created = await createCommentMutation.mutateAsync({ body: replyText, parentId: null });
      setReplyText("");
      setIsComposerActive(false);
      requestAnimationFrame(() => {
        var el = document.getElementById(`comment-${created.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch (_err) {
      // handled by mutation state
    }
  };

  const handleNestedReplySubmit = async (input: { parentId: string; body: string }) => {
    if (!hasVisibleRichText(input.body) || createCommentMutation.isPending) return;

    var created = await createCommentMutation.mutateAsync({
      body: input.body,
      parentId: input.parentId,
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var el = document.getElementById(`comment-${created.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  return (
    <div className={cn("mt-2", className)}>
      <div className={cn(!isComposerActive && "border-b border-border")}>
        {!isComposerActive ? (
          <ReplyComposerTrigger
            onClick={handleActivateComposer}
            avatarInitial={currentInitial}
            avatarUrl={currentUser?.avatarUrl}
            placeholder="Post your reply…"
          />
        ) : (
          <div className="border-b border-border px-4 py-4">
            <ReplyComposerPanel
              replyToHandle={postUsername ?? "post"}
              value={replyText}
              onChange={setReplyText}
              onSubmit={handleReplySubmit}
              onCancel={handleCancelComposer}
              placeholder="Post your reply…"
              isSubmitting={createCommentMutation.isPending}
              error={
                createCommentMutation.isError
                  ? createCommentMutation.error instanceof Error
                    ? createCommentMutation.error.message
                    : "Failed to post comment"
                  : null
              }
            />
          </div>
        )}
      </div>
      <div className="pt-1">
        {isLoading ? (
          <CommentSectionSkeleton />
        ) : normalizedComments.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<span className="text-[22px]">💬</span>}
            headline="No comments yet"
            subline="Be the first to say something"
            primaryCta={{ label: "Write a comment", onClick: handleActivateComposer }}
            className="py-8"
          />
        ) : (
          normalizedComments.map((comment) => (
            <CommentCard
              key={`${postId}-${comment.id}`}
              comment={comment}
              postId={postId}
              postBookmarked={postBookmarked}
              postBookmarkFolderId={postBookmarkFolderId}
              depth={0}
              onReplySubmit={handleNestedReplySubmit}
            />
          ))
        )}
      </div>
      {hasMore ? (
        <div className="px-4 py-3 border-t border-border">
          <button
            type="button"
            className="w-full rounded-full border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-hover disabled:opacity-60"
            onClick={onLoadMore}
            disabled={isFetchingMore}
          >
            {isFetchingMore ? "Loading..." : "Load more comments"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CommentSectionSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 py-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="border-b border-border pb-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-skeleton" />
            <div className="w-28 h-3 rounded bg-skeleton" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 rounded bg-skeleton" />
            <div className="w-3/4 h-3 rounded bg-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}
