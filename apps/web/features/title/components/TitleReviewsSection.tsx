"use client";

import { ArrowDown, PenLine } from "lucide-react";
import { useTitleReviews } from "../hooks/useTitleReviews";
import { TitleReviewCard } from "./TitleReviewCard";

export function TitleReviewsSection(props: {
  filmId: string | null;
  referenceLoading: boolean;
  referenceError: boolean;
  onRetryReference: () => void;
  isTv: boolean;
  onWriteReview: () => void;
  reviewPending?: boolean;
}) {
  const reviews = useTitleReviews(props.filmId);
  const items = reviews.data?.pages.flatMap((page) => page.posts) ?? [];
  const uniqueItems = Array.from(
    new Map(items.map((post) => [post.id, post])).values(),
  );
  const loading =
    !props.isTv &&
    (props.referenceLoading || (Boolean(props.filmId) && reviews.isPending));
  const failed = props.referenceError || reviews.isError;
  const hasReviews = uniqueItems.length > 0;
  return (
    <section aria-label="Title reviews">
      {hasReviews ? (
        <>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted">
                The conversation
              </p>
              <h2 className="font-display text-3xl leading-tight tracking-tight text-fg sm:text-4xl">
                After the credits.
              </h2>
            </div>
            {!props.isTv ? (
              <button
                type="button"
                onClick={props.onWriteReview}
                disabled={props.reviewPending}
                className="mt-5 inline-flex min-h-10 shrink-0 items-center gap-2 text-sm font-semibold text-fg underline decoration-fg/25 underline-offset-4 hover:decoration-fg focus-visible:outline focus-visible:outline-2 disabled:opacity-50"
              >
                <PenLine size={15} aria-hidden />
                <span className="hidden sm:inline">Your review</span>
                <span className="sm:hidden">Write</span>
              </button>
            ) : null}
          </div>
          <div className="mb-1 flex items-center justify-between border-b border-border py-3 text-xs text-fg-muted">
            <span>Community reviews</span>
            <span>Latest first</span>
          </div>
        </>
      ) : null}
      {props.isTv ? (
        <p
          role="status"
          className="py-10 text-sm leading-relaxed text-fg-muted"
        >
          Reviews for TV titles aren’t available yet.
        </p>
      ) : loading ? (
        <div role="status" className="space-y-5 py-8">
          <span className="sr-only">Loading reviews</span>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              aria-hidden
              className="space-y-3 motion-safe:animate-pulse"
            >
              <div className="h-8 w-36 rounded bg-sunken" />
              <div className="h-3 w-full rounded bg-sunken" />
              <div className="h-3 w-2/3 rounded bg-sunken" />
            </div>
          ))}
        </div>
      ) : null}
      {!props.isTv && failed ? (
        <div role="alert" className="my-6 rounded-lg border border-border p-5">
          <p className="text-sm text-fg">Couldn’t load reviews.</p>
          <button
            type="button"
            className="mt-3 min-h-10 text-sm font-semibold text-fg underline underline-offset-4"
            onClick={() =>
              props.referenceError
                ? props.onRetryReference()
                : void reviews.refetch()
            }
          >
            Try again
          </button>
        </div>
      ) : null}
      {!props.isTv && !loading && !failed && uniqueItems.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sunken">
            <PenLine size={20} className="text-fg-muted" strokeWidth={1.5} />
          </div>
          <p className="mb-5 text-sm text-fg-muted">No reviews yet</p>
          <button
            type="button"
            disabled={props.reviewPending}
            onClick={props.onWriteReview}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-strong px-5 text-sm font-medium text-fg hover:bg-sunken disabled:opacity-50"
          >
            Write review
          </button>
        </div>
      ) : null}
      <ul className="divide-y divide-border">
        {uniqueItems.map((review) => (
          <li key={review.id}>
            <TitleReviewCard review={review} />
          </li>
        ))}
      </ul>
      {reviews.hasNextPage ? (
        <button
          type="button"
          disabled={reviews.isFetchingNextPage}
          onClick={() => void reviews.fetchNextPage()}
          className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border-strong text-sm font-medium text-fg hover:bg-sunken disabled:opacity-50"
        >
          {reviews.isFetchingNextPage ? "Loading…" : "More reviews"}
          <ArrowDown size={15} aria-hidden />
        </button>
      ) : null}
    </section>
  );
}
