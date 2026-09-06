"use client";

import Link from "next/link";
import { Heart, MessageCircle, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { Post } from "@/features/feed/types/feed";
import { useLikePost } from "@/features/feed/hooks/usePostMutations";
import { RichTextRenderer } from "@/lib/utils/RichTextRenderer";
import {
  isStoredRichText,
  storedRichTextToPlainText,
} from "@/lib/utils/richContent";
import { RichPostInline } from "@/lib/utils/richPostText";
import { NsfwTextReveal } from "@/components/media/NsfwMediaOverlay";
import { TitleReviewStars } from "./TitleReviewStars";

export function TitleReviewCard({ review }: { review: Post }) {
  const [expanded, setExpanded] = useState(false);
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const like = useLikePost(review.id);
  const textLength = storedRichTextToPlainText(review.body).length;
  const lengthy = textLength > 360;
  const shortReaction = textLength <= 180 && !review.headline;
  const href = ROUTES.POST(review.author.username, review.id);
  return (
    <article className="py-6 sm:py-7">
      <div className="flex items-center gap-3">
        <Link
          href={ROUTES.PROFILE(review.author.username)}
          aria-label={review.author.displayName + " profile"}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sunken text-sm font-medium text-fg"
        >
          {review.author.avatarUrl ? (
            <img
              src={review.author.avatarUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            review.author.displayName.charAt(0)
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={ROUTES.PROFILE(review.author.username)}
            className="text-sm font-semibold text-fg hover:underline"
          >
            {review.author.displayName}
          </Link>
          <p className="text-[11px] text-fg-muted">
            <time dateTime={review.createdAt}>
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </time>
          </p>
        </div>
        {review.film?.rating != null ? (
          <TitleReviewStars rating={review.film.rating} />
        ) : null}
      </div>
      <NsfwTextReveal
        status={review.nsfw?.status ?? "none"}
        categories={review.nsfw?.categories ?? []}
      >
        <div
          className={cn(
            "mt-4 break-words text-[16px] leading-[1.75] text-fg",
            shortReaction &&
              "font-display text-[22px] leading-[1.45] tracking-[-0.01em]",
            lengthy && !expanded && "line-clamp-5",
          )}
        >
          {review.headline ? (
            <h3 className="mb-2 font-display text-2xl">{review.headline}</h3>
          ) : null}
          {isStoredRichText(review.body) ? (
            <RichTextRenderer stored={review.body} />
          ) : (
            <span className="whitespace-pre-wrap">
              <RichPostInline text={review.body} />
            </span>
          )}
        </div>
      </NsfwTextReveal>
      {lengthy ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-2 min-h-9 text-xs font-semibold text-fg underline underline-offset-4"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-5 text-xs text-fg-muted">
        <button
          type="button"
          disabled={like.isPending}
          aria-pressed={review.isLiked}
          aria-label={
            review.isLiked ? "Unlike this review" : "Like this review"
          }
          onClick={() => {
            if (!isSignedIn) {
              openSignIn();
              return;
            }
            like.mutate({ postId: review.id, isLiked: !review.isLiked });
          }}
          className={cn(
            "inline-flex min-h-10 items-center gap-1.5 hover:text-fg disabled:opacity-50",
            review.isLiked && "text-[var(--color-like)]",
          )}
        >
          <Heart
            size={15}
            fill={review.isLiked ? "currentColor" : "none"}
            aria-hidden
          />
          {review.likeCount.toLocaleString()}
        </button>
        <Link
          href={href}
          className="inline-flex min-h-10 items-center gap-1.5 hover:text-fg"
        >
          <MessageCircle size={15} aria-hidden />
          {review.commentCount > 0
            ? review.commentCount.toLocaleString() +
              (review.commentCount === 1 ? " reply" : " replies")
            : "Reply"}
        </Link>
        <Link
          href={href}
          className="ml-auto inline-flex min-h-10 items-center gap-1 hover:text-fg"
        >
          Full review <ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>
      {like.isError ? (
        <p role="alert" className="mt-2 text-xs text-fg">
          Couldn’t update your like. Try again.
        </p>
      ) : null}
    </article>
  );
}
