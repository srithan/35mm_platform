"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, MessageSquareQuote } from "lucide-react";
import { Icon } from "@/components/Icon/Icon";
import { ROUTES } from "@/lib/constants/routes";
import type { QuotePostSort } from "../api/feedApi";
import { InfinitePostList } from "./InfinitePostList";

interface QuotesPageContentProps {
  username: string;
  postId: string;
}

function quoteSortFromSearchParams(value: string | null): QuotePostSort {
  return value === "top" ? "top" : "latest";
}

export function QuotesPageContent({ username, postId }: QuotesPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = quoteSortFromSearchParams(searchParams.get("sort"));

  function updateSort(nextSort: QuotePostSort) {
    const path = ROUTES.POST_QUOTES(username, postId);
    router.replace(nextSort === "latest" ? path : `${path}?sort=${nextSort}`, { scroll: false });
  }

  return (
    <section className="min-h-full" aria-labelledby="quotes-page-title">
      <header className="flex min-h-[68px] items-center gap-3 border-b border-border bg-bg px-3 sm:px-4">
        <Link
          href={ROUTES.POST(username, postId)}
          aria-label="Back to post"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-fg transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <Icon name="arrow-left" strokeWidth={1.8} />
        </Link>

        <h1
          id="quotes-page-title"
          className="min-w-0 flex-1 font-display-discover text-[28px] leading-none tracking-[-0.02em] text-fg"
        >
          Quotes
        </h1>

        <label className="relative shrink-0">
          <span className="sr-only">Sort quotes</span>
          <select
            value={sort}
            onChange={function (event) {
              updateSort(event.target.value as QuotePostSort);
            }}
            className="h-9 appearance-none rounded-full border border-border bg-bg py-0 pl-3.5 pr-8 text-[13px] font-semibold text-fg outline-none transition-colors hover:bg-hover focus:border-accent focus:ring-2 focus:ring-accent/20"
          >
            <option value="latest">Latest</option>
            <option value="top">Most liked</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted"
            strokeWidth={2}
            aria-hidden
          />
        </label>
      </header>

      <InfinitePostList
        quotePostId={postId}
        quoteSort={sort}
        emptyState={{
          icon: <MessageSquareQuote className="h-12 w-12" strokeWidth={1.35} />,
          headline: "No quotes yet",
          subline: "Be the first to add your perspective.",
        }}
      />
    </section>
  );
}
