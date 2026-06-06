"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import { LikeButton } from "./LikeButton";

interface PostActionsProps {
  likes: number;
  comments: number;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  initialReposted?: boolean;
  onCommentClick?: () => void;
  onReplyClick?: () => void;
  onLikeToggle?: (state: { isLiked: boolean; likeCount: number }) => void;
  onBookmarkToggle?: (state: { isBookmarked: boolean }) => void;
  onRepostToggle?: (state: { isReposted: boolean }) => void;
  hideRepostSaveLabels?: boolean;
  showReplyOption?: boolean;
  hideZeroCounts?: boolean;
  useCompactVariant?: boolean;
}

import { Icon } from "@/components/Icon/Icon";

export function PostActions({
  likes,
  comments,
  initialLiked = false,
  initialBookmarked = false,
  initialReposted = false,
  onCommentClick,
  onReplyClick,
  onLikeToggle,
  onBookmarkToggle,
  onRepostToggle,
  hideRepostSaveLabels = false,
  showReplyOption = false,
  hideZeroCounts = false,
  useCompactVariant = false,
}: PostActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [reposted, setReposted] = useState(initialReposted);
  const saveBtnRef = useRef<HTMLButtonElement>(null);
  const repostBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setLikeCount(likes);
  }, [likes]);

  useEffect(() => {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  useEffect(() => {
    setReposted(initialReposted);
  }, [initialReposted]);

  const toggleLike = useCallback(() => {
    const isLiked = !liked;
    const nextLikeCount = isLiked ? likeCount + 1 : likeCount - 1;
    setLiked(isLiked);
    setLikeCount(nextLikeCount);
    onLikeToggle?.({ isLiked, likeCount: nextLikeCount });
  }, [likeCount, liked, onLikeToggle]);

  const toggleSave = useCallback(() => {
    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);
    onBookmarkToggle?.({ isBookmarked: nextBookmarked });

    const btn = saveBtnRef.current;
    if (!btn) return;

    btn.classList.remove("save-pop");
    void btn.offsetWidth;
    btn.classList.add("save-pop");
    btn.addEventListener("animationend", () => btn.classList.remove("save-pop"), {
      once: true,
    });
  }, [bookmarked, onBookmarkToggle]);

  const toggleRepost = useCallback(() => {
    const nextReposted = !reposted;
    setReposted(nextReposted);
    onRepostToggle?.({ isReposted: nextReposted });

    const btn = repostBtnRef.current;
    if (!btn) return;

    btn.classList.remove("repost-pop");
    void btn.offsetWidth;
    btn.classList.add("repost-pop");
    btn.addEventListener("animationend", () => btn.classList.remove("repost-pop"), {
      once: true,
    });
  }, [onRepostToggle, reposted]);

  const hideRepostSaveText = hideRepostSaveLabels || useCompactVariant;
  const groupedActionClass = useCompactVariant ? "justify-start" : "w-full justify-center";

  return (
    <div className={cn("actions", useCompactVariant && "actions-compact")}>
      {showReplyOption && (
        <button
          type="button"
          className={cn("action-btn comment-btn", groupedActionClass)}
          onClick={onReplyClick}
          aria-label="Reply"
        >
          <Icon name="reply" strokeWidth={1.7} />
          <span className="action-count hidden md:inline">Reply</span>
        </button>
      )}
      <LikeButton
        liked={liked}
        likeCount={likeCount}
        hideCount={hideZeroCounts && likeCount === 0}
        onToggle={toggleLike}
        className={groupedActionClass}
      />
      <button
        type="button"
        className={cn("action-btn comment-btn", groupedActionClass)}
        onClick={onCommentClick}
        aria-label="Comments"
      >
        <Icon name="chat" strokeWidth={1.6} />
        {(!hideZeroCounts || comments > 0) && (
          <span className="action-count">{formatCount(comments)}</span>
        )}
      </button>
      <button
        ref={repostBtnRef}
        type="button"
        onClick={toggleRepost}
        className={cn("action-btn repost-btn", groupedActionClass, reposted && "reposted")}
        aria-pressed={reposted}
        aria-label="Repost"
      >
        <Icon name="repost" fill={reposted ? "currentColor" : "none"} strokeWidth={1.6} />
        {!hideRepostSaveText && (
          <span className="action-count hidden md:inline">Repost</span>
        )}
      </button>
      <button
        ref={saveBtnRef}
        type="button"
        onClick={toggleSave}
        className={cn("action-btn save-btn", groupedActionClass, bookmarked && "saved")}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Saved" : "Save"}
      >
        <Icon name="bookmark" fill={bookmarked ? "currentColor" : "none"} strokeWidth={1.6} />
        {!hideRepostSaveText && (
          <span className="action-count hidden md:inline">{bookmarked ? "Saved" : "Save"}</span>
        )}
      </button>
    </div>
  );
}
