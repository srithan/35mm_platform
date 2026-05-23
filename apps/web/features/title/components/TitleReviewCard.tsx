"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import type { MouseEvent } from "react";
import { useCallback, useState } from "react";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import type { MockTitleReview } from "../data/mockTitleReviews";
import { TitleReviewStars } from "./TitleReviewStars";

const READ_MORE_THRESHOLD = 260;

type LikeState = { liked: boolean; count: number };

type TitleReviewCardProps = { review: MockTitleReview };

export function TitleReviewCard(props: TitleReviewCardProps) {
  const v = props.review;
  const profileHref = ROUTES.PROFILE(v.userHandle);
  const needsReadMore = v.body.length > READ_MORE_THRESHOLD;
  const [expanded, setExpanded] = useState(false);
  const [like, setLike] = useState<LikeState>({ liked: false, count: v.likes });

  const toggleLike = useCallback(
    function (e: MouseEvent<HTMLButtonElement>) {
      e.preventDefault();
      e.stopPropagation();
      setLike(function (s) {
        if (s.liked) {
          return { liked: false, count: Math.max(0, s.count - 1) };
        }
        return { liked: true, count: s.count + 1 };
      });
    },
    []
  );

  return (
    <article
      className={cn(
        "rounded-xl bg-sunken/40 p-3 sm:p-4 dark:bg-sunken/25",
        "transition-colors hover:bg-sunken/55 dark:hover:bg-sunken/35"
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white",
            v.avatarClass
          )}
        >
          {v.userName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
            <Link
              href={profileHref}
              className="text-[14px] font-bold text-fg hover:underline"
            >
              {v.userName}
              <span className="ml-1.5 font-medium text-fg-muted">
                @{v.userHandle}
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              {v.hasSpoiler ? (
                <span className="rounded bg-sunken px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-fg-muted">
                  Spoilers
                </span>
              ) : null}
              <time className="text-[11px] text-fg-muted tabular-nums">{v.dateLabel}</time>
            </div>
          </div>
          <div className="mt-2">
            <TitleReviewStars rating={v.rating} />
          </div>
          <p
            className={cn(
              "mt-3 text-base leading-[1.65] text-fg/90 whitespace-pre-wrap",
              needsReadMore && !expanded && "line-clamp-5"
            )}
          >
            {v.body}
          </p>
          {needsReadMore ? (
            <button
              type="button"
              onClick={function (e) {
                e.preventDefault();
                setExpanded(!expanded);
              }}
              className="mt-2 text-[12px] font-semibold text-fg/90 hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          ) : null}
          <div className="mt-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleLike}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[12px] text-fg-muted transition-colors",
                "hover:bg-sunken/60 hover:text-fg",
                like.liked && "text-[color:var(--color-like)]"
              )}
              aria-pressed={like.liked}
              aria-label={like.liked ? "Unlike this review" : "Like this review"}
            >
              <Heart
                className="h-3.5 w-3.5"
                strokeWidth={2}
                fill={like.liked ? "currentColor" : "none"}
              />
              <span>
                {like.count} {like.count === 1 ? "like" : "likes"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
