"use client";

import { useAuth } from "@clerk/nextjs";
import {
  type InfiniteData,
  useQueryClient,
} from "@tanstack/react-query";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { EmptyState } from "@/components/EmptyState";
import { fetchFeed } from "../api/feedApi";
import { useConnectionPreferences } from "../hooks/useConnectionPreferences";
import { useFeed } from "../hooks/useFeed";
import { feedKeys } from "../hooks/queryKeys";
import type { Post } from "../types/feed";
import { PostCard } from "./PostCard";
import { resolvePostImageUrls } from "../utils/postMedia";

type PostVariant = "text" | "film-log" | "image" | "discussion";

function postToVariant(post: Post): PostVariant {
  if (post.type === "discussion") return "discussion";
  if (post.type === "log" || post.type === "review") return "film-log";
  if (post.type === "image") return "image";
  return "text";
}

function formatPostTime(iso: string): string {
  var then = Date.parse(iso);
  if (Number.isNaN(then)) return "now";
  var diff = Date.now() - then;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

interface InfinitePostListProps {
  username?: string;
  emptyState?: React.ComponentProps<typeof EmptyState>;
}

export function InfinitePostList({ username, emptyState }: InfinitePostListProps) {
  const queryClient = useQueryClient();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const connection = useConnectionPreferences();
  const [scrollMargin, setScrollMargin] = useState(0);
  const virtualListStartRef = useRef<HTMLDivElement>(null);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    status,
    isError,
    error,
    refetch,
  } = useFeed(username);

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];
  const queryKey = useMemo(
    function () {
      return username ? feedKeys.profile(username) : feedKeys.home();
    },
    [username]
  );
  const prefetchedCursorRef = useRef<string | null>(null);

  const handleRetry = useCallback(function () {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(function () {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handlePrefetch = useCallback(async function () {
    if (!isAuthLoaded || !hasNextPage || isFetchingNextPage) return;
    if (!data || data.pages.length === 0) return;

    const lastPage = data.pages[data.pages.length - 1];
    const nextCursor = lastPage?.nextCursor;
    if (!nextCursor) return;
    if (prefetchedCursorRef.current === nextCursor) return;

    prefetchedCursorRef.current = nextCursor;
    const prefetchQueryKey = [...queryKey, "prefetch", nextCursor] as const;
    const token = await getToken();

    await queryClient.prefetchInfiniteQuery({
      queryKey: prefetchQueryKey,
      queryFn: async ({ pageParam }) =>
        fetchFeed({
          cursor: pageParam as string | undefined,
          username,
          token,
        }),
      initialPageParam: nextCursor,
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      pages: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    });

    const prefetchedData = queryClient.getQueryData<
      InfiniteData<Awaited<ReturnType<typeof fetchFeed>>, string | undefined>
    >(prefetchQueryKey);
    const prefetchedPage = prefetchedData?.pages?.[0];
    if (!prefetchedPage) return;

    queryClient.setQueryData<
      InfiniteData<Awaited<ReturnType<typeof fetchFeed>>, string | undefined>
    >(queryKey, function (existing) {
      if (!existing) return existing;
      const alreadyHydrated = existing.pageParams.some(function (param) {
        return param === nextCursor;
      });
      if (alreadyHydrated) return existing;

      return {
        pages: [...existing.pages, prefetchedPage],
        pageParams: [...existing.pageParams, nextCursor],
      };
    });
  }, [
    isAuthLoaded,
    hasNextPage,
    isFetchingNextPage,
    data,
    queryKey,
    getToken,
    queryClient,
    username,
  ]);

  const postCards = useMemo(function () {
    var displayVariant: "feed" | "thumb" = connection.slow || connection.saveData ? "thumb" : "feed";
    return posts.map(function (post, index) {
      const resolvedMediaUrls = resolvePostImageUrls(post, displayVariant);
      const viewerMediaUrls = resolvePostImageUrls(post, "full");
      const image = post.media.find((item) => item.type === "image");
      const filmCard = post.film
        ? {
            title: post.film.title,
            meta: [post.film.year, post.film.genres[0]].filter(Boolean).join(" · "),
            posterSrc: post.film.posterUrl,
            imdbId: null,
            rating: post.film.rating ?? undefined,
          }
        : undefined;

      return {
        postId: post.id,
        variant: postToVariant(post),
        sourcePostType: post.type,
        username: post.author.username,
        userId: post.author.id,
        handle: `@${post.author.username}`,
        displayName: post.author.displayName,
        timestamp: formatPostTime(post.createdAt),
        avatarInitial: post.author.displayName.charAt(0).toUpperCase() || "U",
        avatarUrl: post.author.avatarUrl,
        headline: post.headline,
        text: post.body,
        filmCard,
        attachedFilm: post.film,
        mediaUrls: resolvedMediaUrls,
        viewerMediaUrls,
        saveData: connection.saveData,
        linkPreview: post.linkPreview,
        imageSrc: image?.url,
        imageCaption: image?.altText,
        likeCount: post.likeCount,
        liked: post.isLiked,
        bookmarked: post.isBookmarked,
        reposted: post.isReposted,
        commentCount: post.commentCount,
        role: post.author.role,
        roleContext: post.author.roleContext,
        filmsLoggedCount: post.author.filmsLoggedCount,
        animationDelay: (index + 1) * 50,
      };
    });
  }, [posts, connection.slow, connection.saveData]);

  const virtualFeedEnabled = postCards.length > 50;

  useLayoutEffect(
    function () {
      if (!virtualFeedEnabled) return;
      if (!virtualListStartRef.current) return;
      var top = virtualListStartRef.current.getBoundingClientRect().top + window.scrollY;
      setScrollMargin(top);
    },
    [virtualFeedEnabled, postCards.length]
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: postCards.length,
    estimateSize: () => 560,
    overscan: 6,
    scrollMargin,
    getItemKey: function (index) {
      return postCards[index]?.postId ?? index;
    },
  });

  if (status === "pending") return <FeedSkeleton />;
  if (isLoading) return <FeedSkeleton />;
  if (isError) return <FeedError error={error as Error} onRetry={handleRetry} />;
  if (posts.length === 0) return <FeedEmpty emptyState={emptyState} />;

  return (
    <div>
      <div ref={virtualListStartRef}>
        {virtualFeedEnabled ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map(function (virtualRow) {
              var post = postCards[virtualRow.index];
              if (!post) return null;

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                  }}
                >
                  <PostCard {...post} disableAnimation />
                </div>
              );
            })}
          </div>
        ) : (
          postCards.map(function (post) {
            return <PostCard key={post.postId} {...post} />;
          })
        )}
      </div>

      <InfiniteScrollTrigger
        hasNextPage={Boolean(hasNextPage)}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={handleLoadMore}
        onPrefetch={handlePrefetch}
      />
    </div>
  );
}

function InfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onPrefetch,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onPrefetch: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || !hasNextPage || isFetchingNextPage) return;

        if (entry.intersectionRatio >= 0.8) {
          onPrefetch();
        }

        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: [0.1, 0.8] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore, onPrefetch]);

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

function FeedEmpty({
  emptyState,
}: {
  emptyState?: React.ComponentProps<typeof EmptyState>;
}) {
  if (emptyState) {
    return <EmptyState size="lg" {...emptyState} />;
  }

  return (
    <EmptyState
      size="lg"
      icon={
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
          <rect x="6" y="10" width="40" height="32" rx="5" stroke="#c2473a" strokeWidth="2" />
          <path d="M15 20H37M15 27H37M15 34H31" stroke="#c2473a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="42" cy="14" r="3" fill="#c2473a" />
        </svg>
      }
      headline="Your feed is empty"
      subline="Follow people or explore films to get started"
      primaryCta={{ label: "Find people to follow", href: "/suggestions/people" }}
      secondaryCta={{ label: "Explore films", href: "/discover" }}
    />
  );
}
