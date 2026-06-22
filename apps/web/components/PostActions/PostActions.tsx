"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import { LikeButton } from "./LikeButton";
import { BookmarkButton } from "./BookmarkButton";
import type { BookmarkFolderWithCount } from "@/features/bookmarks/types";

interface BookmarkToggleState {
  isBookmarked: boolean;
  previousIsBookmarked: boolean;
  bookmarkFolderId: string | null;
  previousBookmarkFolderId: string | null;
  revert: () => void;
}

interface BookmarkFolderSelectState {
  folderId: string | null;
  previousIsBookmarked: boolean;
  previousBookmarkFolderId: string | null;
  revert: () => void;
}

interface PostActionsProps {
  likes: number;
  comments: number;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  initialBookmarkFolderId?: string | null;
  initialReposted?: boolean;
  onCommentClick?: () => void;
  onReplyClick?: () => void;
  onLikeToggle?: (state: { isLiked: boolean; likeCount: number }) => void;
  onBookmarkToggle?: (state: BookmarkToggleState) => void;
  onBookmarkFolderSelect?: (state: BookmarkFolderSelectState) => Promise<void> | void;
  onCreateBookmarkFolder?: (name: string) => Promise<BookmarkFolderWithCount | void>;
  bookmarkFolders?: BookmarkFolderWithCount[];
  bookmarkFoldersLoading?: boolean;
  creatingBookmarkFolder?: boolean;
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
  initialBookmarkFolderId = null,
  initialReposted = false,
  onCommentClick,
  onReplyClick,
  onLikeToggle,
  onBookmarkToggle,
  onBookmarkFolderSelect,
  onCreateBookmarkFolder,
  bookmarkFolders = [],
  bookmarkFoldersLoading = false,
  creatingBookmarkFolder = false,
  onRepostToggle,
  hideRepostSaveLabels = false,
  showReplyOption = false,
  hideZeroCounts = false,
  useCompactVariant = false,
}: PostActionsProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(likes);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [bookmarkFolderId, setBookmarkFolderId] = useState<string | null>(
    initialBookmarkFolderId ?? null
  );
  const [reposted, setReposted] = useState(initialReposted);
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
    setBookmarkFolderId(initialBookmarkFolderId ?? null);
  }, [initialBookmarkFolderId]);

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
    const previousIsBookmarked = bookmarked;
    const previousBookmarkFolderId = bookmarkFolderId;
    const nextBookmarked = !bookmarked;
    const nextBookmarkFolderId = nextBookmarked ? bookmarkFolderId : null;
    setBookmarked(nextBookmarked);
    if (!nextBookmarked) {
      setBookmarkFolderId(null);
    }
    onBookmarkToggle?.({
      isBookmarked: nextBookmarked,
      previousIsBookmarked,
      bookmarkFolderId: nextBookmarkFolderId,
      previousBookmarkFolderId,
      revert: () => {
        setBookmarked(previousIsBookmarked);
        setBookmarkFolderId(previousBookmarkFolderId);
      },
    });
  }, [bookmarkFolderId, bookmarked, onBookmarkToggle]);

  const handleFolderSelect = useCallback(
    async (folderId: string | null) => {
      if (!onBookmarkFolderSelect) return;
      const previousIsBookmarked = bookmarked;
      const previousBookmarkFolderId = bookmarkFolderId;
      setBookmarkFolderId(folderId);
      if (!bookmarked) {
        setBookmarked(true);
      }
      const revert = () => {
        setBookmarked(previousIsBookmarked);
        setBookmarkFolderId(previousBookmarkFolderId);
      };
      await onBookmarkFolderSelect({
        folderId,
        previousIsBookmarked,
        previousBookmarkFolderId,
        revert,
      });
    },
    [bookmarkFolderId, bookmarked, onBookmarkFolderSelect]
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!onCreateBookmarkFolder) return;
      const folder = await onCreateBookmarkFolder(name);
      if (!folder?.id) return;
      setBookmarked(true);
      setBookmarkFolderId(folder.id);
    },
    [onCreateBookmarkFolder]
  );

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
      {onBookmarkToggle ? (
        <BookmarkButton
          bookmarked={bookmarked}
          folderId={bookmarkFolderId}
          hideLabel={hideRepostSaveText}
          className={groupedActionClass}
          enableFolderPicker={Boolean(onBookmarkFolderSelect && onCreateBookmarkFolder)}
          folders={bookmarkFolders}
          foldersLoading={bookmarkFoldersLoading}
          creatingFolder={creatingBookmarkFolder}
          onToggle={toggleSave}
          onFolderSelect={handleFolderSelect}
          onCreateFolder={handleCreateFolder}
        />
      ) : null}
    </div>
  );
}
