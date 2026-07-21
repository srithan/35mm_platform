"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import { LikeButton } from "./LikeButton";
import { BookmarkButton } from "./BookmarkButton";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
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

interface LikeToggleState {
  isLiked: boolean;
  likeCount: number;
  previousIsLiked: boolean;
  previousLikeCount: number;
  revert: () => void;
}

interface PostActionsProps {
  likes: number;
  comments: number;
  reposts: number;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
  initialBookmarkFolderId?: string | null;
  initialReposted?: boolean;
  onCommentClick?: () => void;
  onReplyClick?: () => void;
  onLikeToggle?: (state: LikeToggleState) => void;
  onBookmarkToggle?: (state: BookmarkToggleState) => void;
  onBookmarkFolderSelect?: (state: BookmarkFolderSelectState) => Promise<void> | void;
  onCreateBookmarkFolder?: (name: string) => Promise<BookmarkFolderWithCount | void>;
  bookmarkFolders?: BookmarkFolderWithCount[];
  bookmarkFoldersLoading?: boolean;
  creatingBookmarkFolder?: boolean;
  likeDisabled?: boolean;
  bookmarkDisabled?: boolean;
  onRepostToggle?: (state: { isReposted: boolean }) => void;
  onQuote?: () => void;
  hideRepostSaveLabels?: boolean;
  showReplyOption?: boolean;
  hideZeroCounts?: boolean;
  useCompactVariant?: boolean;
}

import { Icon } from "@/components/Icon/Icon";

export function PostActions({
  likes,
  comments,
  reposts,
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
  likeDisabled = false,
  bookmarkDisabled = false,
  onRepostToggle,
  onQuote,
  hideRepostSaveLabels = false,
  showReplyOption = false,
  hideZeroCounts = false,
  useCompactVariant = false,
}: PostActionsProps) {
  const [reposted, setReposted] = useState(initialReposted);
  const repostBtnRef = useRef<HTMLButtonElement | null>(null);
  const liked = initialLiked;
  const likeCount = likes;
  const bookmarked = initialBookmarked;
  const bookmarkFolderId = initialBookmarkFolderId ?? null;

  useEffect(() => {
    setReposted(initialReposted);
  }, [initialReposted]);

  const toggleLike = useCallback(() => {
    if (likeDisabled) return;
    const previousIsLiked = liked;
    const previousLikeCount = likeCount;
    const isLiked = !liked;
    const nextLikeCount = isLiked ? likeCount + 1 : likeCount - 1;
    onLikeToggle?.({
      isLiked,
      likeCount: nextLikeCount,
      previousIsLiked,
      previousLikeCount,
      revert: () => undefined,
    });
  }, [likeCount, likeDisabled, liked, onLikeToggle]);

  const toggleSave = useCallback(() => {
    if (bookmarkDisabled) return;
    const previousIsBookmarked = bookmarked;
    const previousBookmarkFolderId = bookmarkFolderId;
    const nextBookmarked = !bookmarked;
    const nextBookmarkFolderId = nextBookmarked ? bookmarkFolderId : null;
    onBookmarkToggle?.({
      isBookmarked: nextBookmarked,
      previousIsBookmarked,
      bookmarkFolderId: nextBookmarkFolderId,
      previousBookmarkFolderId,
      revert: () => undefined,
    });
  }, [bookmarkDisabled, bookmarkFolderId, bookmarked, onBookmarkToggle]);

  const handleFolderSelect = useCallback(
    async (folderId: string | null) => {
      if (bookmarkDisabled) return;
      if (!onBookmarkFolderSelect) return;
      const previousIsBookmarked = bookmarked;
      const previousBookmarkFolderId = bookmarkFolderId;
      await onBookmarkFolderSelect({
        folderId,
        previousIsBookmarked,
        previousBookmarkFolderId,
        revert: () => undefined,
      });
    },
    [bookmarkDisabled, bookmarkFolderId, bookmarked, onBookmarkFolderSelect]
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (bookmarkDisabled) return;
      if (!onCreateBookmarkFolder) return;
      await onCreateBookmarkFolder(name);
    },
    [bookmarkDisabled, onCreateBookmarkFolder]
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
        disabled={likeDisabled}
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
      {onQuote ? (
        <PortalDropdown
          align="start"
          sideOffset={6}
          menuLabel="Repost options"
          menuClassName="min-w-[184px]"
          items={[
            {
              id: "repost",
              label: reposted ? "Undo repost" : "Repost",
              icon: (
                <Icon
                  name="repost"
                  fill={reposted ? "currentColor" : "none"}
                  strokeWidth={1.7}
                />
              ),
              onSelect: toggleRepost,
            },
            {
              id: "quote",
              label: "Quote",
              icon: <Icon name="quote" strokeWidth={1.7} />,
              onSelect: onQuote,
            },
          ]}
          trigger={function ({ ref, isOpen, toggle, onKeyDown, menuId }) {
            return (
              <button
                ref={function (node) {
                  repostBtnRef.current = node;
                  ref(node);
                }}
                type="button"
                onClick={toggle}
                onKeyDown={onKeyDown}
                className={cn(
                  "action-btn repost-btn",
                  groupedActionClass,
                  reposted && "reposted"
                )}
                aria-pressed={reposted}
                aria-label="Repost"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={isOpen ? menuId : undefined}
              >
                <Icon
                  name="repost"
                  fill={reposted ? "currentColor" : "none"}
                  strokeWidth={1.6}
                />
                {(!hideZeroCounts || reposts > 0) && (
                  <span className="action-count">{formatCount(reposts)}</span>
                )}
              </button>
            );
          }}
        />
      ) : (
        <button
          ref={repostBtnRef}
          type="button"
          onClick={toggleRepost}
          className={cn("action-btn repost-btn", groupedActionClass, reposted && "reposted")}
          aria-pressed={reposted}
          aria-label="Repost"
        >
          <Icon name="repost" fill={reposted ? "currentColor" : "none"} strokeWidth={1.6} />
          {(!hideZeroCounts || reposts > 0) && (
            <span className="action-count">{formatCount(reposts)}</span>
          )}
        </button>
      )}
      {onBookmarkToggle ? (
        <BookmarkButton
          bookmarked={bookmarked}
          folderId={bookmarkFolderId}
          hideLabel={hideRepostSaveText}
          className={groupedActionClass}
          disabled={bookmarkDisabled}
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
