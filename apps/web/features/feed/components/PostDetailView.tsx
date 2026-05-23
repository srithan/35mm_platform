"use client";

import type { Post } from "../types/feed";
import { useComments } from "../hooks/useComments";
import { usePost } from "../hooks/usePost";
import { CommentSection } from "./CommentSection";
import { PostCard } from "./PostCard";
import { PostPageBackButton } from "./PostPageBackButton";

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

export function PostDetailView({
  username,
  postId,
}: {
  username: string;
  postId: string;
}) {
  const { data: post, isLoading: postLoading, isError: postError } = usePost(username, postId);
  const { data: commentsResult, isLoading: commentsLoading } = useComments(postId);

  if (postLoading) return <PostDetailSkeleton />;

  if (postError || !post) {
    return (
      <div className="text-sm text-text-tertiary py-12 text-center">
        Post not found.
      </div>
    );
  }

  const legacy = getLegacyShape(post);

  return (
    <div className="pt-4">
      <div className="pl-4">
        <PostPageBackButton />
      </div>
      <PostCard
        postId={post.id}
        variant={legacy.variant ?? "text"}
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
        likeCount={post.likeCount}
        liked={legacy.liked ?? post.isLiked}
        commentCount={post.commentCount}
        replyPreview={legacy.replyPreview}
        replyCount={legacy.replyCount}
        role={post.author.role}
        roleContext={post.author.roleContext}
        filmsLoggedCount={post.author.filmsLoggedCount}
      />
      <CommentSection
        comments={commentsResult?.comments ?? []}
        isLoading={commentsLoading}
        postId={postId}
      />
    </div>
  );
}

function PostDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 py-8">
      <div className="h-6 w-20 rounded bg-skeleton animate-pulse" />
      <div className="bg-elevated rounded-2xl shadow-sm p-5 animate-pulse">
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
      <CommentsSkeleton />
    </div>
  );
}

function CommentsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="border-b border-border px-4 py-4 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-skeleton" />
            <div className="w-24 h-3 rounded bg-skeleton" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 rounded bg-skeleton" />
            <div className="w-2/3 h-3 rounded bg-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}
