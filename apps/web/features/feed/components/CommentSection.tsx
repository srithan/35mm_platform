"use client";

import { useRef, useState } from "react";
import { Image, Film, Smile, Link2, MapPin, Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CommentCard, type Comment as CommentCardType } from "./CommentCard";
import type { Comment as FeedComment } from "../types/feed";

interface CommentSectionProps {
  comments: FeedComment[];
  isLoading?: boolean;
  postId: string;
  postUsername?: string;
  /** Merged with default root spacing (e.g. pass mt-0 when nested in a card). */
  className?: string;
}

function toCommentCard(comment: FeedComment): CommentCardType {
  const raw = comment as FeedComment & { __raw?: unknown };
  const rawObj = raw.__raw && typeof raw.__raw === "object" ? raw.__raw : null;
  const legacy = (rawObj ?? {}) as {
    avatarInitial?: string;
    avatarBg?: string;
    avatarColor?: string;
    timestamp?: string;
    liked?: boolean;
  };

  return {
    id: comment.id,
    username: comment.author.username,
    displayName: comment.author.displayName,
    avatarUrl: comment.author.avatarUrl,
    avatarInitial:
      legacy.avatarInitial ?? comment.author.displayName.charAt(0).toUpperCase() ?? "U",
    avatarBg: legacy.avatarBg,
    avatarColor: legacy.avatarColor,
    text: comment.body,
    timestamp: legacy.timestamp ?? comment.createdAt,
    likeCount: comment.likeCount,
    liked: legacy.liked ?? comment.isLiked,
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
}: CommentSectionProps) {
  const [isComposerActive, setIsComposerActive] = useState(false);
  const [replyText, setReplyText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const normalizedComments: CommentCardType[] = comments.map(toCommentCard);

  const handleActivateComposer = () => {
    setIsComposerActive(true);
    // Focus after state update
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyText(e.target.value);
  };

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    // TODO: hook into real submit flow
    setReplyText("");
    setIsComposerActive(false);
  };

  const replyEnabled = replyText.trim().length > 0;

  return (
    <div className={cn("mt-2", className)}>
      <div className="border-b border-border">
        {!isComposerActive ? (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-sm bg-skeleton text-fg-muted">
              S
            </div>
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
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-sm bg-skeleton text-fg-muted">
              S
            </div>
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
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-hover transition-colors"
                  >
                    <Image className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-hover transition-colors"
                  >
                    <Film className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-hover transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-hover transition-colors hidden sm:inline-flex"
                  >
                    <Link2 className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-hover transition-colors hidden sm:inline-flex"
                  >
                    <MapPin className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-hover transition-colors hidden sm:inline-flex"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    className="p-1 rounded-full hover:bg-hover transition-colors hidden sm:inline-flex"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleReplySubmit}
                  disabled={!replyEnabled}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${replyEnabled
                      ? "bg-fg text-bg hover:bg-black"
                      : "bg-neutral-400 text-bg cursor-default"
                    }`}
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="pt-1">
        {isLoading ? (
          <CommentSectionSkeleton />
        ) : (
          normalizedComments.map((comment) => (
            <CommentCard key={`${postId}-${comment.id}`} comment={comment} depth={0} />
          ))
        )}
      </div>
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
