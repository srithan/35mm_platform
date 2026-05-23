"use client";

import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  discoverFilterChipClasses,
  sidebarFilterSectionTitle,
} from "@/components/filters/sidebarFilterStyles";
import { cn } from "@/lib/utils/cn";
import {
  MOCK_TITLE_REVIEW_TOTAL,
  MOCK_TITLE_REVIEWS_PAGE_SIZE,
  getMockTitleReviewsPool,
  getMockTitleReviewsPoolLength,
  TITLE_REVIEW_KEYWORD_SUGGESTIONS,
} from "../data/mockTitleReviews";
import {
  applyTitleReviewFilters,
  countKeywordInReviews,
  type ReviewSortId,
  type ReviewStarPreset,
} from "../lib/titleReviewBrowse";
import { TitleReviewCard } from "./TitleReviewCard";

const SORT_LABELS: Record<ReviewSortId, string> = {
  popular: "Popular",
  newest: "Newest",
  oldest: "Oldest",
  highest: "Highest rating",
  lowest: "Lowest rating",
};

function mockPageDelay(): Promise<void> {
  return new Promise(function (resolve) {
    window.setTimeout(resolve, 280);
  });
}

const starPresets: { id: ReviewStarPreset; label: string }[] = [
  { id: "all", label: "All" },
  { id: "4plus", label: "4★+" },
  { id: "3plus", label: "3★+" },
  { id: "below3", label: "Under 3★" },
];

const selectClass =
  "min-h-10 w-full min-w-0 sm:max-w-[220px] rounded-xl border border-fg/12 bg-elevated px-3 py-2 text-[13px] text-fg shadow-sm outline-none " +
  "hover:border-fg/22 focus:border-fg/35 focus:ring-2 focus:ring-fg/15";

export function TitleReviewsSection() {
  const fullPool = useMemo(function () {
    return getMockTitleReviewsPool();
  }, []);

  const poolLen = getMockTitleReviewsPoolLength();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [sort, setSort] = useState<ReviewSortId>("popular");
  const [stars, setStars] = useState<ReviewStarPreset>("all");
  const [keyword, setKeyword] = useState<string | null>(null);
  const [hideSpoilers, setHideSpoilers] = useState(false);

  const [visibleCount, setVisibleCount] = useState(MOCK_TITLE_REVIEWS_PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  useEffect(
    function () {
      const t = window.setTimeout(function () {
        setDebouncedQuery(searchInput.trim());
      }, 260);
      return function () {
        window.clearTimeout(t);
      };
    },
    [searchInput]
  );

  const browseInput = useMemo(
    function () {
      return {
        query: debouncedQuery,
        sort: sort,
        stars: stars,
        keyword: keyword,
        hideSpoilers: hideSpoilers,
      };
    },
    [debouncedQuery, sort, stars, keyword, hideSpoilers]
  );

  const filtered = useMemo(
    function () {
      return applyTitleReviewFilters(fullPool, browseInput);
    },
    [fullPool, browseInput]
  );

  const keywordCounts = useMemo(
    function () {
      const m: Record<string, number> = {};
      for (let i = 0; i < TITLE_REVIEW_KEYWORD_SUGGESTIONS.length; i += 1) {
        const kw = TITLE_REVIEW_KEYWORD_SUGGESTIONS[i];
        m[kw] = countKeywordInReviews(fullPool, kw);
      }
      return m;
    },
    [fullPool]
  );

  useEffect(
    function () {
      setVisibleCount(MOCK_TITLE_REVIEWS_PAGE_SIZE);
    },
    [debouncedQuery, sort, stars, keyword, hideSpoilers]
  );

  const visible = useMemo(
    function () {
      return filtered.slice(0, visibleCount);
    },
    [filtered, visibleCount]
  );

  const hasMore = visibleCount < filtered.length;

  const onLoadMore = useCallback(
    function () {
      if (loading || !hasMore) return;
      setLoading(true);
      void mockPageDelay().then(function () {
        setVisibleCount(function (c) {
          return c + MOCK_TITLE_REVIEWS_PAGE_SIZE;
        });
        setLoading(false);
      });
    },
    [hasMore, loading]
  );

  const hasActiveFilters =
    debouncedQuery.length > 0 ||
    stars !== "all" ||
    keyword !== null ||
    hideSpoilers ||
    sort !== "popular";

  return (
    <section aria-label="Title reviews">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h2 className="text-lg font-bold tracking-[-0.02em] text-fg">Reviews on 35mm</h2>
        <p className="text-[13px] font-medium tabular-nums text-fg/80">
          {MOCK_TITLE_REVIEW_TOTAL.toLocaleString()} reviews
        </p>
      </div>
      <p className="mb-4 text-[13px] text-fg/75">
        Search, filter, and sort like on larger sites. In production, the same controls map to
        server queries so you can browse very large review lists without loading everything at once.
      </p>

      <div
        className="mb-4 space-y-4 rounded-2xl bg-sunken/35 px-3 py-3.5 sm:px-4 sm:py-4 dark:bg-sunken/25"
      >
        <div>
          <p className={cn(sidebarFilterSectionTitle, "mb-2")}>Search &amp; sort</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
                strokeWidth={2}
                aria-hidden
              />
              <input
                type="search"
                value={searchInput}
                onChange={function (e) {
                  setSearchInput(e.target.value);
                }}
                onKeyDown={function (e) {
                  if (e.key === "Escape") setSearchInput("");
                }}
                placeholder="Search review text, member name…"
                className={cn(
                  "w-full min-h-10 rounded-xl border border-fg/12 bg-bg py-2 pl-9 pr-9 text-[13px] text-fg shadow-sm outline-none placeholder:text-fg-muted",
                  "hover:border-fg/22 focus:border-fg/35 focus:ring-2 focus:ring-fg/15"
                )}
                autoComplete="off"
                name="title-review-search"
                aria-label="Search reviews"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={function () {
                    setSearchInput("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fg-muted hover:bg-sunken hover:text-fg"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col sm:w-auto sm:shrink-0">
              <label htmlFor="title-review-sort" className="sr-only">
                Sort reviews
              </label>
              <select
                id="title-review-sort"
                className={selectClass}
                value={sort}
                onChange={function (e) {
                  setSort(e.target.value as ReviewSortId);
                }}
              >
                {(Object.keys(SORT_LABELS) as ReviewSortId[]).map(function (k) {
                  return (
                    <option key={k} value={k}>
                      {SORT_LABELS[k]}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        <div>
          <p className={cn(sidebarFilterSectionTitle, "mb-2")}>Rating</p>
          <div className="flex flex-wrap gap-2">
            {starPresets.map(function (p) {
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={function () {
                    setStars(p.id);
                  }}
                  className={discoverFilterChipClasses(stars === p.id)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={cn(sidebarFilterSectionTitle, "mb-2")}>Mentions (keywords)</p>
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
            <div className="flex w-max min-w-full flex-wrap gap-2 sm:min-w-0">
              <button
                type="button"
                onClick={function () {
                  setKeyword(null);
                }}
                className={discoverFilterChipClasses(keyword === null)}
              >
                All
              </button>
              {TITLE_REVIEW_KEYWORD_SUGGESTIONS.map(function (kw) {
                const c = keywordCounts[kw] ?? 0;
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={function () {
                      setKeyword(function (cur) {
                        return cur === kw ? null : kw;
                      });
                    }}
                    className={discoverFilterChipClasses(keyword === kw)}
                  >
                    {kw}
                    {c > 0 ? (
                      <span className="ml-1 tabular-nums text-fg-muted">({c})</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-fg/12 bg-bg px-3 py-2.5 text-[13px] text-fg">
          <input
            type="checkbox"
            checked={hideSpoilers}
            onChange={function (e) {
              setHideSpoilers(e.target.checked);
            }}
            className="mt-0.5 h-4 w-4 rounded border-fg/25 accent-[var(--color-film-gold)]"
          />
          <span>
            <span className="font-medium">Hide reviews with spoilers</span>
            <span className="mt-0.5 block text-[12px] text-fg/70">
              Marks are manual in this sample; a live site might detect spoilers automatically.
            </span>
          </span>
        </label>
      </div>

      <p className="mb-3 text-[12px] text-fg-muted">
        {filtered.length.toLocaleString()}{" "}
        {filtered.length === 1 ? "match" : "matches"} in this {poolLen.toLocaleString()}-review
        preview
        {hasActiveFilters ? " · " : ""}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={function () {
              setSearchInput("");
              setDebouncedQuery("");
              setSort("popular");
              setStars("all");
              setKeyword(null);
              setHideSpoilers(false);
            }}
            className="font-medium text-fg underline decoration-fg/25 underline-offset-2 hover:decoration-fg/50"
          >
            Reset filters
          </button>
        )}
      </p>

      <div className="min-w-0">
        {visible.length === 0 ? (
          <div
            className="rounded-2xl bg-sunken/40 px-3 py-10 text-center dark:bg-sunken/30"
            role="status"
          >
            <p className="text-[14px] font-medium text-fg">No reviews match these filters</p>
            <p className="mt-1.5 text-[13px] text-fg/70">
              Try a different search, a keyword, or a rating bucket—or reset filters above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-fg/8">
            {visible.map(function (r) {
              return (
                <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                  <TitleReviewCard review={r} />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {visible.length > 0 && hasMore ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            className={cn(
              "inline-flex w-full min-h-[2.75rem] items-center justify-center gap-2 rounded-xl",
              "border border-fg/12 bg-elevated px-4 text-[13px] font-semibold text-fg",
              "transition hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60",
              "sm:w-auto sm:min-w-[200px]"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.25} />
                <span>Loading…</span>
              </>
            ) : (
              <span>Load more reviews</span>
            )}
          </button>
        </div>
      ) : null}

      {visible.length > 0 && !hasMore && filtered.length === poolLen ? (
        <p className="mt-4 text-[12px] leading-relaxed text-fg/65">
          You’re caught up in this sample dataset. A live API would keep paging through the full{" "}
          <strong className="font-semibold text-fg/80">
            {MOCK_TITLE_REVIEW_TOTAL.toLocaleString()}
          </strong>{" "}
          community reviews, with the same search and filters.
        </p>
      ) : null}
    </section>
  );
}
