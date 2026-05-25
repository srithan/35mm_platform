"use client";

import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/EmptyState";
import { PostCard } from "@/features/feed/components/PostCard";
import { useBookmarks } from "../hooks/useBookmarks";
import type { Post } from "@/features/feed/types/feed";

function postToVariant(post: Post): "text" | "film-log" | "image" | "discussion" {
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

export function BookmarksPageContent() {
  var query = useBookmarks();
  var posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.status === "pending") {
    return <div className="px-4 py-10 text-sm text-fg-muted">Loading bookmarks...</div>;
  }

  if (query.isError) {
    return (
      <div className="px-4 py-12 text-sm text-fg-muted">
        Failed to load bookmarks.
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        size="lg"
        icon={<span className="text-[24px]">🔖</span>}
        headline="Nothing saved yet"
        subline="Tap the bookmark icon on any post to save it here"
      />
    );
  }

  return (
    <div className="w-full max-w-[640px] mx-auto xl:w-[640px] xl:max-w-[640px]">
      {posts.map((post, index) => {
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

        return (
          <PostCard
            key={post.id}
            postId={post.id}
            variant={postToVariant(post)}
            sourcePostType={post.type}
            username={post.author.username}
            userId={post.author.id}
            handle={`@${post.author.username}`}
            displayName={post.author.displayName}
            timestamp={formatPostTime(post.createdAt)}
            avatarInitial={post.author.displayName.charAt(0).toUpperCase() || "U"}
            avatarUrl={post.author.avatarUrl}
            headline={post.headline}
            text={post.body}
            filmCard={filmCard}
            attachedFilm={post.film}
            mediaUrls={post.mediaUrls}
            linkPreview={post.linkPreview}
            imageSrc={image?.url}
            imageCaption={image?.altText}
            likeCount={post.likeCount}
            liked={post.isLiked}
            reposted={post.isReposted}
            bookmarked={post.isBookmarked}
            commentCount={post.commentCount}
            role={post.author.role}
            roleContext={post.author.roleContext}
            filmsLoggedCount={post.author.filmsLoggedCount}
            animationDelay={(index + 1) * 35}
          />
        );
      })}
      <InfiniteTrigger
        hasNextPage={Boolean(query.hasNextPage)}
        isFetching={query.isFetchingNextPage}
        onLoad={() => void query.fetchNextPage()}
      />
    </div>
  );
}

function InfiniteTrigger({
  hasNextPage,
  isFetching,
  onLoad,
}: {
  hasNextPage: boolean;
  isFetching: boolean;
  onLoad: () => void;
}) {
  var ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    var el = ref.current;
    if (!el) return;

    var observer = new IntersectionObserver(
      function ([entry]) {
        if (entry.isIntersecting && hasNextPage && !isFetching) {
          onLoad();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching, onLoad]);

  return (
    <div ref={ref} className="h-8 flex items-center justify-center text-sm text-fg-muted">
      {isFetching ? "Loading more..." : null}
    </div>
  );
}
