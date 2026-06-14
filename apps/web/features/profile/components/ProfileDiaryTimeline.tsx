"use client";

import { useEffect, useMemo, useRef } from "react";
import { EmptyState } from "@/components/EmptyState";
import { FilmPoster } from "@/components/FilmPoster";
import { StarRating } from "@/components/StarRating";
import { useFeed } from "@/features/feed/hooks/useFeed";
import type { Post } from "@/features/feed/types/feed";

function isDiaryPost(post: Post) {
  return post.type === "log" || post.type === "review";
}

function formatDiaryDate(iso: string): string {
  var dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(dt).toUpperCase();
}

function formatDiaryDay(iso: string): string {
  var dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "--";
  return String(dt.getDate()).padStart(2, "0");
}

function formatDiaryWeekday(iso: string): string {
  var dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(dt).toUpperCase();
}

function formatMonthBucket(iso: string): string {
  var dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "UNKNOWN";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(dt);
}

function defaultDiaryBody(post: Post): string {
  if (!post.film?.title) return "";
  return `Logged ${post.film.title}`;
}

export function ProfileDiaryTimeline({
  username,
  displayName,
  isOwnProfile,
  onLogFilm,
}: {
  username: string;
  displayName?: string;
  isOwnProfile: boolean;
  onLogFilm: () => void;
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    status,
  } = useFeed(username);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const diaryPosts = useMemo(
    function () {
      var allPosts = data?.pages.flatMap(function (page) {
        return page.posts;
      }) ?? [];
      return allPosts.filter(isDiaryPost);
    },
    [data]
  );
  const diaryEntries = useMemo(
    function () {
      return diaryPosts.map(function (post, index) {
        var month = formatMonthBucket(post.createdAt);
        var prevMonth = index > 0 ? formatMonthBucket(diaryPosts[index - 1].createdAt) : null;
        var startsMonth = index === 0 || month !== prevMonth;
        return {
          post,
          month,
          startsMonth,
        };
      });
    },
    [diaryPosts]
  );

  useEffect(
    function () {
      if (status === "pending" || isLoading || isFetchingNextPage) return;
      if (!hasNextPage) return;
      if (diaryEntries.length > 0) return;
      void fetchNextPage();
    },
    [status, isLoading, isFetchingNextPage, hasNextPage, diaryEntries.length, fetchNextPage]
  );

  useEffect(
    function () {
      var sentinel = sentinelRef.current;
      if (!sentinel) return;
      if (!hasNextPage) return;

      var observer = new IntersectionObserver(
        function (entries) {
          if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
          if (isFetchingNextPage) return;
          void fetchNextPage();
        },
        { rootMargin: "200px 0px 300px 0px" }
      );
      observer.observe(sentinel);
      return function () {
        observer.disconnect();
      };
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  if (status === "pending" || isLoading) {
    return (
      <div className="px-6 py-6 space-y-3">
        {Array.from({ length: 4 }).map(function (_, index) {
          return (
            <div key={`diary-skeleton-${index}`} className="animate-pulse rounded-xl border border-border bg-elevated px-4 py-3">
              <div className="h-3 w-16 rounded bg-sunken-2" />
              <div className="mt-3 h-4 w-40 rounded bg-sunken-2" />
              <div className="mt-2 h-3 w-56 rounded bg-sunken-2" />
            </div>
          );
        })}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[14px] text-fg-muted">Couldn&apos;t load diary right now.</p>
        <button
          type="button"
          className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-[13px] font-medium text-fg hover:bg-hover"
          onClick={function () {
            void refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (diaryEntries.length === 0 && !hasNextPage) {
    return (
      <EmptyState
        size="lg"
        icon={<span className="text-[24px]">🎞️</span>}
        headline={
          isOwnProfile
            ? "No films logged yet"
            : `${displayName ?? username} hasn't logged any films yet`
        }
        primaryCta={
          isOwnProfile
            ? {
                label: "Log a film",
                onClick: onLogFilm,
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="px-4 py-4 md:px-6">
      <div className="mx-auto max-w-[720px]">
        {diaryEntries.map(function (entry) {
          var post = entry.post;
          var filmTitle = post.film?.title ?? "Untitled film";
          var filmYear = post.film?.year;
          var rating = post.film?.rating ?? 0;
          var body = post.body.trim();
          var autoBody = defaultDiaryBody(post);
          var showBody = body.length > 0 && body !== autoBody;
          var meta = [filmYear ? String(filmYear) : null, post.type === "review" ? "Review" : "Log"]
            .filter(Boolean)
            .join(" · ");

          return (
            <div key={post.id} className="mb-4 last:mb-0">
              {entry.startsMonth ? (
                <div className="mb-2 border-b border-border-strong pb-1.5">
                  <h3 className="text-[12px] uppercase tracking-[0.12em] text-fg-muted">
                    {entry.month}
                  </h3>
                </div>
              ) : null}

              <article className="group flex gap-3 rounded-2xl border border-border bg-elevated px-3 py-3 transition-colors hover:bg-hover/50">
                <div className="w-[52px] shrink-0 text-center">
                  <div className="text-[10px] tracking-[0.08em] text-fg-muted">
                    {formatDiaryWeekday(post.createdAt)}
                  </div>
                  <div className="mt-0.5 font-display text-[24px] leading-none text-fg">
                    {formatDiaryDay(post.createdAt)}
                  </div>
                  <div className="mt-1 text-[9px] tracking-[0.08em] text-fg-muted">
                    {formatDiaryDate(post.createdAt).split(" ")[0]}
                  </div>
                </div>

                <div className="w-px bg-border/70" aria-hidden />

                <FilmPoster
                  src={post.film?.posterUrl ?? null}
                  alt={filmTitle}
                  size="review"
                  className="shrink-0 rounded-md"
                  placeholderGradient="from-[#1e2a1a] to-[#2e4a2a]"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display text-[18px] leading-tight text-fg">
                      {filmTitle}
                    </h4>
                    {rating > 0 ? (
                      <div className="mt-0.5 flex items-center gap-1.5 rounded-full border border-border bg-bg px-2 py-1">
                        <StarRating rating={rating} size="sm" />
                        <span className="text-[11px] text-fg-muted">{rating.toFixed(1)}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-fg-muted">
                    {meta}
                  </div>
                  {showBody ? (
                    <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-fg-light">
                      {body}
                    </p>
                  ) : (
                    <p className="mt-2 text-[12px] text-fg-muted">
                      No notes added
                    </p>
                  )}
                </div>
              </article>
            </div>
          );
        })}

        {hasNextPage ? (
          <div ref={sentinelRef} className="py-4 text-center text-[12px] text-fg-muted">
            {isFetchingNextPage ? "Loading more entries..." : "Scroll for more"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
