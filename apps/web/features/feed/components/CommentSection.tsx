"use client";

import { useRef, useState } from "react";
import { Image, Film, Smile, Link2, MapPin, Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { useCreateComment } from "../hooks/useCommentMutations";
import { CommentCard, type Comment as CommentCardType } from "./CommentCard";
import type { Comment as FeedComment } from "../types/feed";

interface CommentSectionProps {
  comments: FeedComment[];
  isLoading?: boolean;
  postId: string;
  postUsername?: string;
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
  className,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
}: CommentSectionProps) {
  const [isComposerActive, setIsComposerActive] = useState(false);
  const [replyText, setReplyText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const createCommentMutation = useCreateComment(postId);
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const currentInitial = initialForName(currentUser?.displayName ?? currentUser?.username);
  const normalizedComments: CommentCardType[] = comments.map(toCommentCard);

  const handleActivateComposer = () => {
    setIsComposerActive(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
  };

  const handleReplySubmit = async () => {
    var body = replyText.trim();
    if (!body || createCommentMutation.isPending) return;

    try {
      var created = await createCommentMutation.mutateAsync({ body, parentId: null });
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
    if (!input.body.trim() || createCommentMutation.isPending) return;

    var created = await createCommentMutation.mutateAsync({
      body: input.body.trim(),
      parentId: input.parentId,
    });

    requestAnimationFrame(() => {
      var el = document.getElementById(`comment-${created.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const replyEnabled =
    replyText.trim().length > 0 && !createCommentMutation.isPending;

  return (
    <div className={cn("mt-2", className)}>
      <div className="border-b border-border">
        {!isComposerActive ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <Avatar initial={currentInitial} src={currentUser?.avatarUrl} className="w-10 h-10" />
            <button
              type="button"
              onClick={handleActivateComposer}
              className="flex-1 text-left text-[17px] leading-[1.5] font-medium text-fg-light bg-transparent border-none outline-none cursor-text"
            >
              Post your reply
            </button>
            <button
              type="button"
              onClick={handleActivateComposer}
              className="px-4 py-1.5 rounded-full text-[13px] font-medium bg-neutral-400 text-bg"
            >
              Reply
            </button>
          </div>
        ) : (
          <div className="flex gap-3 items-start px-4 py-3">
            <Avatar initial={currentInitial} src={currentUser?.avatarUrl} className="w-10 h-10" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-fg-muted mb-1">
                {postUsername ? (
                  <>
                    Replying to <span className="text-fg">@{postUsername}</span>
                  </>
                ) : (
                  "Write a reply"
                )}
              </p>
              <textarea
                ref={textareaRef}
                value={replyText}
                onChange={handleReplyChange}
                rows={1}
                placeholder="Post your reply"
                className="w-full resize-none bg-transparent outline-none text-[15px] leading-[1.6] text-fg placeholder:text-fg-muted"
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-fg-muted">
                  <button type="button" className="p-1 rounded-full hover:bg-hover transition-colors">
                    <Image className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-1 rounded-full hover:bg-hover transition-colors">
                    <Film className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-1 rounded-full hover:bg-hover transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-1 rounded-full hover:bg-hover transition-colors hidden sm:inline-flex">
                    <Link2 className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-1 rounded-full hover:bg-hover transition-colors hidden sm:inline-flex">
                    <MapPin className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-1 rounded-full hover:bg-hover transition-colors hidden sm:inline-flex">
                    <Bold className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1 rounded-full hover:bg-hover transition-colors hidden sm:inline-flex">
                    <Italic className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void handleReplySubmit()}
                  disabled={!replyEnabled}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${replyEnabled
                    ? "bg-fg text-bg hover:bg-black"
                    : "bg-neutral-400 text-bg cursor-default"
                    }`}
                >
                  {createCommentMutation.isPending ? "Posting" : "Reply"}
                </button>
              </div>
              {createCommentMutation.isError ? (
                <p className="mt-2 text-xs text-film-red">
                  {createCommentMutation.error instanceof Error
                    ? createCommentMutation.error.message
                    : "Failed to post comment"}
                </p>
              ) : null}
            </div>
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
