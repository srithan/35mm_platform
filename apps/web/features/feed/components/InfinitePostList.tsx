"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { useFeed } from "../hooks/useFeed";
import type { Post } from "../types/feed";
import { PostCard } from "./PostCard";

type LegacyPostShape = {
  variant?: "text" | "film-log" | "image" | "discussion";
  handle?: string;
  timestamp?: string;
  avatarInitial?: string;
  avatarBg?: string;
  avatarColor?: string;
  filmRef?: string;
  filmCard?: {
    title: string;
    meta: string;
    posterSrc?: string | null;
    imdbId?: string | null;
    rating?: number;
  };
  imageSrc?: string;
  imageCaption?: string;
  liked?: boolean;
  replyPreview?: { username: string; text: string; time: string };
  replyCount?: number;
};

function getLegacyShape(post: Post): LegacyPostShape {
  const candidate = post as Post & { __raw?: unknown };
  if (!candidate.__raw || typeof candidate.__raw !== "object") {
    return {};
  }

  return candidate.__raw as LegacyPostShape;
}

export function InfinitePostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useFeed();

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  if (isLoading) return <FeedSkeleton />;
  if (isError) return <FeedError error={error as Error} onRetry={() => void refetch()} />;
  if (posts.length === 0) return <FeedEmpty />;

  return (
    <div>
      {posts.map((post, i) => {
        const legacy = getLegacyShape(post);
        return (
          <PostCard
            key={post.id}
            postId={post.id}
            variant={legacy.variant ?? "text"}
            username={post.author.username}
            handle={legacy.handle ?? `@${post.author.username}`}
            displayName={post.author.displayName}
            timestamp={legacy.timestamp ?? "now"}
            avatarInitial={
              legacy.avatarInitial ?? post.author.displayName.charAt(0).toUpperCase() ?? "U"
            }
            avatarBg={legacy.avatarBg}
            avatarColor={legacy.avatarColor}
            avatarUrl={post.author.avatarUrl}
            headline={post.headline}
            text={post.body}
            filmRef={legacy.filmRef}
            filmCard={legacy.filmCard}
            imageSrc={legacy.imageSrc}
            imageCaption={legacy.imageCaption}
            likeCount={post.likeCount}
            liked={legacy.liked ?? post.isLiked}
            commentCount={post.commentCount}
            replyPreview={legacy.replyPreview}
            replyCount={legacy.replyCount}
            role={post.author.role}
            roleContext={post.author.roleContext}
            filmsLoggedCount={post.author.filmsLoggedCount}
            animationDelay={(i + 1) * 50}
          />
        );
      })}

      <InfiniteScrollTrigger
        hasNextPage={Boolean(hasNextPage)}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => void fetchNextPage()}
      />
    </div>
  );
}

function InfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <div ref={ref} className="h-8 flex items-center justify-center">
      {isFetchingNextPage && <span className="text-sm text-text-tertiary">Loading more...</span>}
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block overflow-hidden rounded-sm",
        "bg-gradient-to-r from-sunken via-neutral-100 to-sunken",
        "bg-skeleton-shimmer animate-skeleton-shimmer",
        className
      )}
      aria-hidden
    />
  );
}

function PostCardSkeleton({
  showFilm = false,
  animationDelay = 0,
}: {
  showFilm?: boolean;
  animationDelay?: number;
}) {
  return (
    <article
      className="PostCard mb-3 w-full animate-fade-up rounded-lg px-4 py-4"
      style={{
        backgroundColor: "var(--color-bg)",
        animationDelay: `${animationDelay}ms`,
      }}
      aria-hidden
    >
      <div className="flex min-w-0 items-start">
        <Skeleton className="mr-2 h-10 w-10 shrink-0 self-start rounded-full" />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between gap-3 pr-1">
            <Skeleton className="h-3 max-w-[58%] flex-1 rounded" />
            <Skeleton className="h-6 w-6 shrink-0 rounded-md opacity-50" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-[72%] rounded" />
            <Skeleton className="h-3.5 w-full rounded" />
            <Skeleton className="h-3.5 w-[84%] rounded" />
          </div>

          {showFilm ? (
            <div className="mt-3.5 flex overflow-hidden rounded border border-border/50">
              <Skeleton className="h-[88px] w-[72px] shrink-0 rounded-none" />
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-3">
                <Skeleton className="h-3 w-[75%] rounded" />
                <Skeleton className="h-2.5 w-[48%] rounded" />
              </div>
            </div>
          ) : null}

          <div className="-ml-1 mt-3.5 flex items-center gap-4">
            {Array.from({ length: 4 }).map((_, actionIndex) => (
              <Skeleton
                key={actionIndex}
                className="h-7 w-7 shrink-0 rounded-full opacity-80"
              />
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div>
      <PostCardSkeleton animationDelay={0} />
      <PostCardSkeleton showFilm animationDelay={60} />
      <PostCardSkeleton animationDelay={120} />
    </div>
  );
}

function FeedError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-text-tertiary">{error.message}</p>
      <button
        onClick={onRetry}
        className="text-sm text-film-red underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  );
}

function FeedEmpty() {
  return (
    <div className="py-10 text-center text-xs text-fg-muted tracking-[0.05em]">
      No posts yet.
    </div>
  );
}
