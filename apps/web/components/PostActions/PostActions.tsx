"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import { spawnParticles } from "@/lib/utils/spawnParticles";

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
}: PostActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [reposted, setReposted] = useState(initialReposted);
  const heartBtnRef = useRef<HTMLButtonElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
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

    const btn = heartBtnRef.current;
    const countEl = countRef.current;
    if (!btn || !countEl) return;

    // Spring animation
    btn.classList.remove("pop");
    void btn.offsetWidth;
    btn.classList.add("pop");
    const removePop = () => btn.classList.remove("pop");
    btn.addEventListener("animationend", removePop, { once: true });

    // Count flip
    countEl.classList.remove("flip-up", "flip-down");
    void countEl.offsetWidth;
    countEl.classList.add(isLiked ? "flip-up" : "flip-down");
    countEl.addEventListener("animationend", () => {
      countEl.classList.remove("flip-up", "flip-down");
    }, { once: true });

    if (isLiked) spawnParticles(btn);
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

  return (
    <div className={cn("actions grid gap-0", showReplyOption ? "grid-cols-5" : "grid-cols-4")}>
      {showReplyOption && (
        <button
          type="button"
          className="action-btn comment-btn w-full justify-center"
          onClick={onReplyClick}
          aria-label="Reply"
        >
          <Icon name="reply" strokeWidth={1.7} />
          <span className="action-count hidden md:inline">Reply</span>
        </button>
      )}
      <button
        ref={heartBtnRef}
        type="button"
        onClick={toggleLike}
        className={cn("action-btn heart-btn w-full justify-center", liked && "liked")}
        aria-pressed={liked}
      >
        <Icon name="heart" fill={liked ? "currentColor" : "none"} strokeWidth={1.6} />
        <span ref={countRef} className="action-count">
          {formatCount(likeCount)}
        </span>
      </button>
      <button
        type="button"
        className="action-btn comment-btn w-full justify-center"
        onClick={onCommentClick}
        aria-label="Comments"
      >
        <Icon name="chat" strokeWidth={1.6} />
        <span className="action-count">{formatCount(comments)}</span>
      </button>
      <button
        ref={repostBtnRef}
        type="button"
        onClick={toggleRepost}
        className={cn("action-btn repost-btn w-full justify-center", reposted && "reposted")}
        aria-pressed={reposted}
        aria-label="Repost"
      >
        <Icon name="repost" fill={reposted ? "currentColor" : "none"} strokeWidth={1.6} />
        {!hideRepostSaveLabels && (
          <span className="action-count hidden md:inline">Repost</span>
        )}
      </button>
      <button
        ref={saveBtnRef}
        type="button"
        onClick={toggleSave}
        className={cn("action-btn save-btn w-full justify-center", bookmarked && "saved")}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Saved" : "Save"}
      >
        <Icon name="bookmark" fill={bookmarked ? "currentColor" : "none"} strokeWidth={1.6} />
        {!hideRepostSaveLabels && (
          <span className="action-count hidden md:inline">{bookmarked ? "Saved" : "Save"}</span>
        )}
      </button>
    </div>
  );
}
