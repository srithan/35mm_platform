"use client";

import { useEffect, useRef } from "react";
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

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-elevated rounded-2xl shadow-sm p-5 animate-pulse">
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
