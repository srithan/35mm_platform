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
import type { ProfileFeedKind } from "../api/feedApi";
import { useConnectionPreferences } from "../hooks/useConnectionPreferences";
import { useFeed } from "../hooks/useFeed";
import { feedKeys } from "../hooks/queryKeys";
import type { Post } from "../types/feed";
import { PostCard } from "./PostCard";
import { resolvePostImageUrls } from "../utils/postMedia";
import { deduplicateFeedPosts } from "../utils/repostDeduplication";

type PostVariant = "text" | "film-log" | "image" | "discussion";
type FeedPageData = Awaited<ReturnType<typeof fetchFeed>>;
type FeedInfiniteData = InfiniteData<FeedPageData, string | undefined>;

function postToVariant(post: Post): PostVariant {
  if (post.type === "discussion") return "discussion";
  if (post.type === "log" || post.type === "review") return "film-log";
  if (post.type === "image") return "image";
  return "text";
}

function formatPostTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "now";
  const diff = Date.now() - then;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

interface InfinitePostListProps {
  username?: string;
  profileFeedKind?: ProfileFeedKind;
  emptyState?: React.ComponentProps<typeof EmptyState>;
  postTypes?: Array<Post["type"]>;
  postFilter?: (post: Post) => boolean;
}
const PREFETCH_MAX_PAGES = 3;
const SCROLL_FAST_THRESHOLD_PX_PER_SEC = 1_300;
const SCROLL_RAPID_THRESHOLD_PX_PER_SEC = 2_400;

export function InfinitePostList({
  username,
  profileFeedKind = "all",
  emptyState,
  postTypes,
  postFilter,
}: InfinitePostListProps) {
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
  } = useFeed(username, profileFeedKind);

  const posts = useMemo(function () {
    return deduplicateFeedPosts(data?.pages.flatMap((page) => page.posts) ?? []);
  }, [data?.pages]);
  const filteredPosts = useMemo(
    function () {
      if (!postTypes || postTypes.length === 0) return posts;
      const allowed = new Set(postTypes);
      return posts.filter(function (post) {
        return allowed.has(post.type);
      });
    },
    [posts, postTypes]
  );
  const visiblePosts = useMemo(
    function () {
      if (!postFilter) return filteredPosts;
      return filteredPosts.filter(postFilter);
    },
    [filteredPosts, postFilter]
  );
  const queryKey = useMemo(
    function () {
      return username ? feedKeys.profile(username, profileFeedKind) : feedKeys.home();
    },
    [profileFeedKind, username]
  );
  const prefetchInFlightRef = useRef(false);
  const prefetchScrollVelocityRef = useRef(0);
  const resolvePrefetchDepth = function (velocityPxPerSecond: number, isSlowConnection: boolean): number {
    if (isSlowConnection) return 1;
    if (velocityPxPerSecond >= SCROLL_RAPID_THRESHOLD_PX_PER_SEC) return PREFETCH_MAX_PAGES;
    if (velocityPxPerSecond >= SCROLL_FAST_THRESHOLD_PX_PER_SEC) return 2;
    return 1;
  };

  const handleRetry = useCallback(function () {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(function () {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handlePrefetch = useCallback(async function () {
    if (prefetchInFlightRef.current) return;
    if (!isAuthLoaded || !hasNextPage || isFetchingNextPage) return;
    if (!data || data.pages.length === 0) return;

    const velocity = prefetchScrollVelocityRef.current;
    const pagesToPrefetch = resolvePrefetchDepth(velocity, connection.slow);
    if (pagesToPrefetch <= 0) return;

    prefetchInFlightRef.current = true;
    try {
      const token = await getToken();

      const updateCache = function (
        existing: FeedInfiniteData | undefined,
        page: FeedPageData,
        cursor: string | undefined
      ) {
        if (!existing) return existing;

        const alreadyHydrated = existing.pageParams.some(function (existingCursor) {
          return existingCursor === cursor;
        });
        if (alreadyHydrated) return existing;

        return {
          pages: [...existing.pages, page],
          pageParams: [...existing.pageParams, cursor],
        };
      };

      let nextCursor: string | null | undefined = data.pages[data.pages.length - 1]?.nextCursor;
      for (let pageIndex = 0; pageIndex < pagesToPrefetch; pageIndex += 1) {
        if (!nextCursor) break;
        const cursor: string = nextCursor;
        const alreadyCached = queryClient.getQueryData<FeedInfiniteData>(queryKey);
        const alreadyHasCursor = !!alreadyCached?.pageParams.some(function (param) {
          return param === cursor;
        });
        if (alreadyHasCursor) {
          nextCursor = alreadyCached?.pages[alreadyCached.pageParams.indexOf(cursor)]?.nextCursor;
          continue;
        }

        const pageRef = [...queryKey, "prefetch", cursor] as const;
        const prefetchedPage = await queryClient.fetchQuery({
          queryKey: pageRef,
          queryFn: function () {
            return fetchFeed({
              cursor,
              username,
              profileFeedKind,
              token: token ?? undefined,
            });
          },
          staleTime: 30_000,
          gcTime: 5 * 60_000,
        });

        queryClient.setQueryData<FeedInfiniteData>(queryKey, function (existing) {
          return updateCache(existing, prefetchedPage, cursor);
        });

        nextCursor = prefetchedPage.nextCursor;
      }
    } finally {
      prefetchInFlightRef.current = false;
    }
  }, [
    isAuthLoaded,
    hasNextPage,
    isFetchingNextPage,
    data,
    data?.pages,
    prefetchScrollVelocityRef,
    queryClient,
    connection.slow,
    queryKey,
    getToken,
    profileFeedKind,
    username,
  ]);

  const postCards = useMemo(function () {
    return visiblePosts.map(function (post, index) {
      const resolvedMediaUrls = resolvePostImageUrls(post, "feed");
      const viewerMediaUrls = resolvePostImageUrls(post, "full");
      const image = post.media.find((item) => item.type === "image");
      const filmCard = post.film
        ? {
            title: post.film.title,
            year: post.film.year ?? 0,
            genre: post.film.genres[0],
            posterUrl: post.film.posterUrl,
            rating:
              post.film.rating == null ? undefined : Math.round(post.film.rating * 2),
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
        editBody: post.body,
        filmCard,
        attachedFilm: post.film,
        mediaUrls: resolvedMediaUrls,
        viewerMediaUrls,
        prioritizeMedia: index === 0,
        poll: post.poll,
        saveData: connection.saveData,
        linkPreview: post.linkPreview,
        imageSrc: image?.url,
        imageCaption: image?.altText,
        media: post.media,
        likeCount: post.likeCount,
        repostCount: post.repostCount,
        liked: post.isLiked,
        bookmarked: post.isBookmarked,
        bookmarkFolderId: post.bookmarkFolderId,
        reposted: post.isReposted,
        repostContext: post.repostContext,
        quotedPost: post.quotedPost,
        quotedPostUnavailable: post.quotedPostUnavailable,
        commentCount: post.commentCount,
        role: post.author.role,
        roleContext: post.author.roleContext,
        filmsLoggedCount: post.author.filmsLoggedCount,
        animationDelay: (index + 1) * 50,
      };
    });
  }, [visiblePosts, connection.saveData]);

  useEffect(
    function () {
      if (!postTypes || postTypes.length === 0) return;
      if (status === "pending" || isLoading || isFetchingNextPage) return;
      if (!hasNextPage) return;
      if (postCards.length > 0) return;
      void fetchNextPage();
    },
    [postTypes, status, isLoading, isFetchingNextPage, hasNextPage, postCards.length, fetchNextPage]
  );

  useLayoutEffect(
    function () {
      if (!virtualListStartRef.current) return;
      const top = virtualListStartRef.current.getBoundingClientRect().top + window.scrollY;
      setScrollMargin(top);
    },
    [postCards.length]
  );

  const rowVirtualizer = useWindowVirtualizer({
    count: postCards.length,
    estimateSize: () => 560,
    overscan: 6,
    scrollMargin,
    useAnimationFrameWithResizeObserver: true,
    getItemKey: function (index) {
      return postCards[index]?.postId ?? index;
    },
  });

  if (status === "pending") return <FeedSkeleton />;
  if (isLoading) return <FeedSkeleton />;
  if (isError) return <FeedError error={error as Error} onRetry={handleRetry} />;
  if (postCards.length === 0 && !hasNextPage && !isFetchingNextPage) {
    return <FeedEmpty emptyState={emptyState} />;
  }

  return (
    <div>
      <div ref={virtualListStartRef}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map(function (virtualRow) {
            const post = postCards[virtualRow.index];
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
      </div>

      <InfiniteScrollTrigger
        hasNextPage={Boolean(hasNextPage)}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={handleLoadMore}
        onPrefetch={handlePrefetch}
        setPrefetchVelocity={function (velocity) {
          prefetchScrollVelocityRef.current = velocity;
        }}
      />
    </div>
  );
}

function InfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onPrefetch,
  setPrefetchVelocity,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onPrefetch: () => void;
  setPrefetchVelocity: (velocity: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastScrollYRef = useRef(0);
  const lastScrollSampleRef = useRef(0);

  useEffect(function () {
    const el = ref.current;
    if (!el) return;
    lastScrollYRef.current = window.scrollY;
    lastScrollSampleRef.current = performance.now();

    const onScroll = function () {
      const now = performance.now();
      const lastSample = lastScrollSampleRef.current;
      if (now - lastSample < 80) return;
      const nowY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = Math.abs(nowY - lastY);
      const elapsed = now - lastSample;

      const velocity = elapsed > 0 ? (delta / elapsed) * 1000 : 0;
      setPrefetchVelocity(velocity);
      lastScrollYRef.current = nowY;
      lastScrollSampleRef.current = now;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || !hasNextPage || isFetchingNextPage) return;

        if (entry.intersectionRatio > 0) {
          onPrefetch();
        }

        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "1800px", threshold: [0, 0.5] }
    );

    observer.observe(el);
    return function () {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [hasNextPage, isFetchingNextPage, onLoadMore, onPrefetch, setPrefetchVelocity]);

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
            <div className="mt-3.5 flex overflow-hidden rounded border border-border">
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
          <rect x="6" y="10" width="40" height="32" rx="5" stroke="currentColor" strokeWidth="2" />
          <path d="M15 20H37M15 27H37M15 34H31" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="42" cy="14" r="3" fill="currentColor" />
        </svg>
      }
      headline="Your feed is empty"
      subline="Follow people or explore films to get started"
      primaryCta={{ label: "Find people to follow", href: "/suggestions/people" }}
      secondaryCta={{ label: "Explore films", href: "/discover" }}
    />
  );
}
