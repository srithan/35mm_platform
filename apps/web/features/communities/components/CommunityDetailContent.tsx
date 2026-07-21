"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BellOff, ChevronDown, Flag, Flame, MoreHorizontal, UserX } from "lucide-react";
import { useComposerModal } from "@/components/layout/PostComposerModalContext";
import { PortalDropdown } from "@/components/PortalDropdown/PortalDropdown";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { ROUTES } from "@/lib/constants/routes";
import { useShowCoverBackButton } from "@/lib/hooks/useShowCoverBackButton";
import { PostCard } from "@/features/feed/components/PostCard";
import { PostComposerTrigger } from "@/features/feed/components/PostComposerTrigger";
import type { Post } from "@/features/feed/types/feed";
import { useCommunity, useCommunityFeed } from "../hooks/useCommunities";

type LegacyPostShape = {
  variant?: "text" | "film-log" | "image" | "festival" | "discussion";
  handle?: string;
  timestamp?: string;
  avatarInitial?: string;
  avatarBg?: string;
  avatarColor?: string;
  filmRef?: string;
  filmCard?: {
    title: string;
    year: number;
    genre?: string;
    posterUrl?: string | null;
    rating?: number;
  };
  imageSrc?: string;
  imageCaption?: string;
  tags?: string[];
  festivalBadge?: string;
  liked?: boolean;
  replyPreview?: { username: string; text: string; time: string };
  replyCount?: number;
};

type CommunitySort = "best" | "new" | "hot" | "old";

function getLegacyShape(post: Post): LegacyPostShape {
  const candidate = post as Post & { __raw?: unknown };
  if (!candidate.__raw || typeof candidate.__raw !== "object") {
    return {};
  }
  return candidate.__raw as LegacyPostShape;
}

export function CommunityDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const showCoverBack = useShowCoverBackButton();
  const [isJoined, setIsJoined] = useState(false);
  const [sortBy, setSortBy] = useState<CommunitySort>("best");
  const {
    data: community,
    isLoading: isCommunityLoading,
    isError: isCommunityError,
    error: communityError,
    refetch: refetchCommunity,
  } = useCommunity(slug);

  if (isCommunityLoading) return <CommunityDetailSkeleton />;

  if (isCommunityError || !community) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-fg-muted">
          {(communityError as Error | undefined)?.message ?? "Community not found"}
        </p>
        <button
          type="button"
          onClick={() => void refetchCommunity()}
          className="mt-3 text-sm text-accent underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="relative">
        <div className="h-36 md:h-44" style={{ background: community.cover.gradient }} />
        {showCoverBack ? (
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
                return;
              }
              router.push(ROUTES.COMMUNITIES);
            }}
            className="absolute top-3 left-3 md:top-4 md:left-4 inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-black/35 text-white px-3 py-1.5 text-[11px] backdrop-blur-sm hover:bg-black/45 transition-colors"
            aria-label="Back to communities"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
        ) : null}
        <div
          className="absolute left-4 md:left-6 top-full -translate-y-1/2 w-20 h-20 rounded-full border-4 border-white flex items-center justify-center font-semibold text-[28px] z-10"
          style={{
            background: community.avatar.gradient,
            color: community.avatar.textColor,
          }}
        >
          {community.avatar.initial}
        </div>
      </div>

      <section className="px-4 md:px-6 pb-4 pt-6 border-b border-border bg-elevated">
        <div className="flex items-center justify-end gap-2">
          {community.isMature && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-[#4c0519] text-[#ffe4e6]">
              Mature (18+)
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsJoined((value) => !value)}
            className="rounded-full text-[12px] px-3.5 py-2 transition-colors border border-neutral-300 bg-elevated text-fg hover:border-neutral-400"
          >
            {isJoined ? "Joined" : "Join"}
          </button>
          <PortalDropdown
            align="end"
            menuLabel="Community actions"
            items={[
              {
                id: "report",
                label: "Report",
                icon: <Flag className="w-4 h-4" strokeWidth={1.8} />,
                danger: true,
              },
              {
                id: "mute",
                label: "Mute",
                icon: <BellOff className="w-4 h-4" strokeWidth={1.8} />,
              },
              {
                id: "block",
                label: "Block",
                icon: <UserX className="w-4 h-4" strokeWidth={1.8} />,
                danger: true,
              },
            ]}
            trigger={({ ref, toggle, onKeyDown, isOpen, menuId }) => (
              <button
                ref={ref}
                type="button"
                onClick={toggle}
                onKeyDown={onKeyDown}
                aria-label="More community actions"
                aria-expanded={isOpen}
                aria-controls={menuId}
                aria-haspopup="menu"
                className="flex-shrink-0 p-2 rounded-full text-fg-muted hover:text-fg hover:bg-border transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          />
        </div>

        <h1 className="mt-1 text-[28px] leading-none">{community.name}</h1>
        <p className="mt-2 text-[13.5px] leading-[1.65] text-fg-light">{community.description}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.06em] text-fg-muted">
          {community.topics.map((topic) => (
            <span key={topic} className="px-2 py-1 rounded-md bg-bg">
              {topic}
            </span>
          ))}
        </div>

      </section>

      <div className="w-full max-w-[600px] mr-auto">
        <CommunityComposerTrigger />
        <CommunityFeedFilters sortBy={sortBy} onSortChange={setSortBy} />
        <CommunityPostList slug={slug} sortBy={sortBy} />
      </div>
    </div>
  );
}

function CommunityFeedFilters({
  sortBy,
  onSortChange,
}: {
  sortBy: CommunitySort;
  onSortChange: (sort: CommunitySort) => void;
}) {
  const label = sortBy.charAt(0).toUpperCase() + sortBy.slice(1);

  return (
    <div className="border-y border-border bg-elevated px-4 py-2.5 flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-[0.05em] text-fg-muted">
        Filters
      </span>
      <PortalDropdown
        align="end"
        menuLabel="Sort posts"
        items={[
          { id: "best", label: "Best", onSelect: () => onSortChange("best") },
          { id: "new", label: "New", onSelect: () => onSortChange("new") },
          { id: "hot", label: "Hot", onSelect: () => onSortChange("hot") },
          { id: "old", label: "Old", onSelect: () => onSortChange("old") },
        ]}
        trigger={({ ref, toggle, onKeyDown, isOpen, menuId }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            onKeyDown={onKeyDown}
            aria-label="Sort posts"
            aria-expanded={isOpen}
            aria-controls={menuId}
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-elevated text-fg text-[11px] px-3 py-1.5 hover:border-neutral-400 transition-colors"
          >
            <Flame className="w-3.5 h-3.5" />
            Sort: {label}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      />
    </div>
  );
}

function CommunityComposerTrigger() {
  const { openComposerModal } = useComposerModal();

  return (
    <PostComposerTrigger
      onOpen={openComposerModal}
      user={{
        name: CURRENT_USER.name,
        avatarUrl: CURRENT_USER.avatarUrl,
        initial: CURRENT_USER.initial,
      }}
    />
  );
}

function CommunityPostList({ slug, sortBy }: { slug: string; sortBy: CommunitySort }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useCommunityFeed(slug);
  const triggerRef = useRef<HTMLDivElement>(null);

  const posts = useMemo(() => {
    const collected = data?.pages.flatMap((page) => page.posts) ?? [];
    const sorted = [...collected];

    if (sortBy === "new") {
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return sorted;
    }

    if (sortBy === "old") {
      sorted.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      return sorted;
    }

    if (sortBy === "hot") {
      sorted.sort(
        (a, b) =>
          b.likeCount + b.commentCount * 1.5 - (a.likeCount + a.commentCount * 1.5)
      );
      return sorted;
    }

    // best
    sorted.sort(
      (a, b) =>
        b.likeCount + b.commentCount * 2 + b.repostCount -
        (a.likeCount + a.commentCount * 2 + a.repostCount)
    );
    return sorted;
  }, [data?.pages, sortBy]);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) return <CommunityFeedSkeleton />;

  if (isError) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-fg-muted">{(error as Error).message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-sm text-accent underline underline-offset-2"
        >
          Retry feed
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-fg-muted tracking-[0.05em]">
        No community posts yet.
      </div>
    );
  }

  return (
    <div>
      {posts.map((post, index) => {
        const legacy = getLegacyShape(post);
        const variant = legacy.variant === "festival" ? "discussion" : (legacy.variant ?? "text");
        return (
          <PostCard
            key={post.id}
            postId={post.id}
            variant={variant}
            username={post.author.username}
            displayName={post.author.displayName}
            handle={legacy.handle ?? `@${post.author.username}`}
            timestamp={legacy.timestamp ?? "now"}
            avatarInitial={legacy.avatarInitial ?? post.author.displayName.charAt(0).toUpperCase()}
            avatarBg={legacy.avatarBg}
            avatarColor={legacy.avatarColor}
            avatarUrl={post.author.avatarUrl}
            headline={post.headline}
            text={post.body}
            filmRef={legacy.filmRef}
            filmCard={legacy.filmCard}
            imageSrc={legacy.imageSrc}
            imageCaption={legacy.imageCaption}
            media={post.media}
            quotedPost={post.quotedPost}
            quotedPostUnavailable={post.quotedPostUnavailable}
            likeCount={post.likeCount}
            repostCount={post.repostCount}
            liked={post.isLiked}
            commentCount={post.commentCount}
            replyPreview={legacy.replyPreview}
            replyCount={legacy.replyCount}
            role={post.author.role}
            roleContext={post.author.roleContext}
            filmsLoggedCount={post.author.filmsLoggedCount}
            animationDelay={(index + 1) * 40}
            tab="for-you"
          />
        );
      })}

      <div ref={triggerRef} className="h-8 flex items-center justify-center">
        {isFetchingNextPage && <span className="text-sm text-text-tertiary">Loading more...</span>}
      </div>
    </div>
  );
}

function CommunityDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-36 md:h-44 bg-neutral-200" />
      <div className="px-4 md:px-6 py-4">
        <div className="w-16 h-16 rounded-full bg-skeleton-strong -mt-10 border-4 border-white" />
        <div className="mt-3 h-7 w-1/2 rounded bg-skeleton" />
        <div className="mt-2 h-3 w-full rounded bg-skeleton" />
        <div className="mt-1.5 h-3 w-4/5 rounded bg-skeleton" />
      </div>
    </div>
  );
}

function CommunityFeedSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-elevated rounded-2xl shadow-sm p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-skeleton" />
            <div className="flex flex-col gap-2">
              <div className="w-32 h-3 rounded bg-skeleton" />
              <div className="w-20 h-3 rounded bg-skeleton" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 rounded bg-skeleton" />
            <div className="w-4/5 h-3 rounded bg-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}
