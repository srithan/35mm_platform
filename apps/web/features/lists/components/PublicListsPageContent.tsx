"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Plus, Rows3, Search, X } from "lucide-react";
import type { FilmListSummary } from "@35mm/types";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { FilmPoster } from "@/components/FilmPoster";
import { TextFilterMenu } from "@/components/filters/TextFilterMenu";
import {
  BROWSE_DENSITY_VARIANT,
  BROWSE_DIRECTORY_TABS_ENABLED,
} from "@/lib/config/uiFlags";
import { DiscoverTabs } from "@/features/discover/components/DiscoverTabs";
import { useAuthPrompt } from "@/features/auth/components/AuthPromptProvider";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import type { PublicFilmListFilters, PublicFilmListSort } from "../api/listsApi";
import { useListMutations, usePublicLists } from "../hooks/useLists";
import { parseListTags } from "../lib/listMeta";
import { ListEditorModal, type ListEditorValues } from "./ListEditorModal";

const SORT_OPTIONS: Array<{ id: PublicFilmListSort; label: string }> = [
  { id: "popular", label: "Popular" },
  { id: "recent", label: "Recent" },
];

export function PublicListsPageContent() {
  const [sort, setSort] = useState<PublicFilmListSort>("popular");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<NonNullable<PublicFilmListFilters["format"]>>("all");
  const [size, setSize] = useState<NonNullable<PublicFilmListFilters["size"]>>("all");
  useEffect(function debounceSearch() {
    const timeout = setTimeout(function () { setQuery(search.trim()); }, 300);
    return function () { clearTimeout(timeout); };
  }, [search]);
  const [editorOpen, setEditorOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listsQuery = usePublicLists(sort, { q: query, format, size });
  const mutations = useListMutations();
  const router = useRouter();
  const { requireAuth } = useAuthPrompt();
  const useCompactBrowseDensity = BROWSE_DENSITY_VARIANT === "compact";

  const lists = useMemo(
    function () {
      return listsQuery.data?.pages.flatMap(function (page) {
        return page.items;
      }) ?? [];
    },
    [listsQuery.data]
  );

  useEffect(
    function observePaginationSentinel() {
      const sentinel = sentinelRef.current;
      if (!sentinel || !listsQuery.hasNextPage) return;

      const observer = new IntersectionObserver(
        function (entries) {
          if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
          if (listsQuery.isFetchingNextPage) return;
          void listsQuery.fetchNextPage();
        },
        { rootMargin: "300px 0px" }
      );
      observer.observe(sentinel);
      return function () {
        observer.disconnect();
      };
    }, [listsQuery.fetchNextPage, listsQuery.hasNextPage, listsQuery.isFetchingNextPage]
  );

  async function toggleLike(list: FilmListSummary) {
    requireAuth(
      function () {
        void mutations.toggleLike.mutateAsync({ id: list.id, isLiked: list.isLiked });
      },
      { message: "Log in to like this list." }
    );
  }

  function openCreateList() {
    requireAuth(
      function () {
        setEditorOpen(true);
      },
      { message: "Log in to create a list." }
    );
  }

  function createList(values: ListEditorValues) {
    mutations.createList.mutate(
      {
        title: values.title,
        description: values.description || null,
        visibility: values.visibility,
        isRanked: values.isRanked,
        tags: parseListTags(values.tags),
      },
      {
        onSuccess: function (created) {
          setEditorOpen(false);
          router.push(ROUTES.LIST(created.id));
        },
      }
    );
  }

  const pageGutterClass = useCompactBrowseDensity
    ? "w-full px-4 pb-16 sm:px-6 lg:px-0"
    : "mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-10";
  const listGridClass = useCompactBrowseDensity
    ? "flex flex-col gap-3"
    : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="min-h-full w-full bg-bg">
      {BROWSE_DIRECTORY_TABS_ENABLED ? <DiscoverTabs active="lists" /> : null}
      <div className={pageGutterClass}>
        <h1 className="sr-only">Lists</h1>
        <div className="mb-7 flex flex-col gap-x-5 border-y border-border py-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative my-1 w-full sm:order-last sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" aria-hidden />
            <input
              type="search"
              aria-label="Search lists"
              placeholder="Search lists…"
              maxLength={100}
              value={search}
              onChange={function (event) { setSearch(event.target.value); }}
              className="h-9 w-full rounded-[3px] border border-border bg-sunken pl-8 pr-8 text-[13px] font-medium text-fg placeholder:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search ? <button type="button" aria-label="Clear search" onClick={function () { setSearch(""); setQuery(""); }} className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-[3px] text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"><X className="h-3.5 w-3.5" aria-hidden /></button> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <TextFilterMenu
              ariaLabel="Sort lists"
              value={sort}
              triggerLabel={
                "Sort by " + (SORT_OPTIONS.find((option) => option.id === sort)?.label ?? "Popular")
              }
              options={SORT_OPTIONS.map(function (option) {
                return { value: option.id, label: option.label };
              })}
              onValueChange={function (value) {
                setSort(value as PublicFilmListSort);
              }}
            />
            <TextFilterMenu
              ariaLabel="Filter list type"
              value={format}
              triggerLabel={format === "all" ? "Type" : format === "ranked" ? "Ranked" : "Unranked"}
              options={[{ value: "all", label: "All types" }, { value: "ranked", label: "Ranked" }, { value: "unranked", label: "Unranked" }]}
              onValueChange={function (value) { setFormat(value as typeof format); }}
            />
            <TextFilterMenu
              ariaLabel="Filter list size"
              value={size}
              triggerLabel={size === "all" ? "Size" : size === "short" ? "Under 10" : size === "medium" ? "10-50" : "Over 50"}
              options={[{ value: "all", label: "Any size" }, { value: "short", label: "Under 10 films" }, { value: "medium", label: "10-50 films" }, { value: "long", label: "Over 50 films" }]}
              onValueChange={function (value) { setSize(value as typeof size); }}
            />
            {search || format !== "all" || size !== "all" ? (
              <button type="button" className="h-9 rounded-[3px] px-1.5 text-[11px] font-semibold uppercase tracking-normal text-accent hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35" onClick={function () { setSearch(""); setQuery(""); setFormat("all"); setSize("all"); }}>Reset</button>
            ) : null}
            {useCompactBrowseDensity ? (
              <button
                type="button"
                onClick={openCreateList}
                className="inline-flex h-9 items-center gap-1.5 rounded-[3px] border border-border bg-elevated px-2.5 text-[11px] font-semibold uppercase tracking-normal text-fg transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Create List
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={listGridClass}
          role={useCompactBrowseDensity ? "list" : undefined}
          aria-label={useCompactBrowseDensity ? "Public lists" : undefined}
        >
          {!useCompactBrowseDensity ? (
            <button
              type="button"
              onClick={openCreateList}
              className="group flex min-h-[190px] flex-col items-center justify-center gap-2 self-stretch rounded-3xl border border-dashed border-border-strong bg-elevated p-5 text-fg transition-colors hover:border-fg-muted hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-sunken text-fg-muted transition-colors group-hover:text-fg">
                <Plus className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-display-discover text-[22px] font-normal leading-tight">Create List</span>
              <span className="text-[12px] text-fg-muted">A new collection, curated by you.</span>
            </button>
          ) : null}

        {listsQuery.isLoading ? (
          <PublicListsSkeleton compactDensity={useCompactBrowseDensity} />
        ) : listsQuery.isError ? (
          <EmptyState
            size="lg"
            icon={<Rows3 className="h-7 w-7" aria-hidden />}
            headline="Lists didn’t load"
            subline="Check your connection, then try the browse again."
            primaryCta={{
              label: "Try again",
              onClick: function () {
                void listsQuery.refetch();
              },
            }}
          />
        ) : lists.length === 0 ? (
          <EmptyState
            size="lg"
            icon={<Rows3 className="h-7 w-7" aria-hidden />}
            headline={query || format !== "all" || size !== "all" ? "No lists found" : "No public lists yet"}
            subline="Try another search or filter, or start your own collection."
          />
        ) : (
          <>
            <div className="contents">
              {lists.map(function (list) {
                return (
                  <PublicListCard
                    key={list.id}
                    compactDensity={useCompactBrowseDensity}
                    list={list}
                    onToggleLike={toggleLike}
                  />
                );
              })}
            </div>
            <div ref={sentinelRef} className="col-span-full h-1" aria-hidden />
            {listsQuery.isFetchingNextPage ? (
              <p className="col-span-full pb-4 text-center text-[12px] text-fg-muted">Loading more lists…</p>
            ) : null}
          </>
        )}
        </div>
      </div>

      <ListEditorModal
        open={editorOpen}
        onClose={function () {
          if (!mutations.createList.isPending) setEditorOpen(false);
        }}
        mode="create"
        onSubmit={createList}
        isSubmitting={mutations.createList.isPending}
        error={mutations.createList.error instanceof Error ? mutations.createList.error.message : null}
      />
    </div>
  );
}

export function PublicListCard({
  compactDensity = BROWSE_DENSITY_VARIANT === "compact",
  list,
  onToggleLike,
}: {
  compactDensity?: boolean;
  list: FilmListSummary;
  onToggleLike: (list: FilmListSummary) => Promise<void>;
}) {
  const [isLiked, setIsLiked] = useState(list.isLiked);
  const [likeCount, setLikeCount] = useState(list.likeCount);
  const [likePending, setLikePending] = useState(false);
  const posters = Array.from({ length: 4 }, function (_, index) {
    return list.posterUrls[index] ?? null;
  });

  useEffect(function syncLikeState() {
    setIsLiked(list.isLiked);
    setLikeCount(list.likeCount);
  }, [list.isLiked, list.likeCount]);

  async function handleLike(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (likePending || list.isOwner) return;
    const previousLiked = isLiked;
    const previousCount = likeCount;
    setIsLiked(!previousLiked);
    setLikeCount(Math.max(0, previousCount + (previousLiked ? -1 : 1)));
    setLikePending(true);
    try {
      await onToggleLike({ ...list, isLiked: previousLiked });
    } catch (_error) {
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setLikePending(false);
    }
  }

  return (
    <article
      role={compactDensity ? "listitem" : undefined}
      className={cn(
        "group grid min-w-0 transition-colors",
        compactDensity
          ? "grid-cols-[92px_minmax(0,1fr)_minmax(2.75rem,auto)] items-start gap-x-3 border-b border-border bg-bg px-1 py-3 hover:bg-hover/60 sm:grid-cols-[160px_minmax(0,1fr)_minmax(3rem,auto)] sm:gap-x-4 sm:px-2 sm:py-4"
          : "grid-cols-[112px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 rounded-3xl border border-border bg-elevated p-5 shadow-[0_2px_12px_rgba(0,0,0,0.045)] hover:bg-hover hover:shadow-[0_5px_18px_rgba(0,0,0,0.07)]"
      )}
    >
      <Link
        href={ROUTES.LIST(list.id)}
        aria-label={`Open ${list.title} by ${list.owner.displayName}`}
        className={cn(
          "relative isolate block aspect-[1.12/1] shrink-0 rounded-sm no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg",
          compactDensity ? "w-[92px] sm:w-[160px]" : "w-[112px]"
        )}
      >
        {posters.map(function (posterUrl, index) {
          return (
            <div
              key={index}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5",
                compactDensity ? "w-[56%]" : "w-[58%]"
              )}
              style={{
                left: `${index * (compactDensity ? 13 : 14)}%`,
                zIndex: 4 - index,
                scale: `${1 - index * 0.045}`,
              }}
            >
              <FilmPoster
                src={posterUrl}
                alt=""
                size="xl"
                className={cn(
                  "w-full rounded border border-bg",
                  compactDensity
                    ? "shadow-[2px_1px_5px_rgba(0,0,0,0.14)]"
                    : "shadow-[3px_1px_6px_rgba(0,0,0,0.16)]"
                )}
              />
            </div>
          );
        })}
      </Link>

      <div
        className={cn(
          "flex w-full min-w-0 flex-1 flex-col",
          compactDensity && "pt-0.5 sm:pt-0"
        )}
      >
        <h2>
          <Link
            href={ROUTES.LIST(list.id)}
            className={cn(
              "break-words rounded-sm text-fg [text-wrap:pretty] no-underline hover:text-fg-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              compactDensity
                ? "line-clamp-2 text-[16px] font-semibold leading-[1.25] sm:text-[17px]"
                : "line-clamp-3 font-display-discover text-[22px] font-normal leading-[1.2]"
            )}
          >
            {list.title}
          </Link>
        </h2>
        <div
          className={cn(
            "flex flex-wrap items-center gap-y-1 text-[11px] text-fg-muted",
            compactDensity ? "mt-1 gap-x-2.5" : "mt-2 gap-x-3"
          )}
        >
          <span>{formatCount(list.entryCount)} {list.entryCount === 1 ? "film" : "films"}</span>
          {list.isRanked ? <span className="flex items-center gap-1"><Rows3 className="h-3 w-3" aria-hidden />Ranked</span> : null}
          {compactDensity ? (
            <Link
              href={ROUTES.PROFILE(list.owner.username)}
              className="inline-flex min-w-0 max-w-[12rem] items-center gap-1.5 rounded-sm text-fg-muted no-underline hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Avatar
                src={list.owner.avatarUrl}
                initial={list.owner.displayName.charAt(0)}
                size="sm"
                className="h-4 w-4 text-[8px]"
              />
              <span className="truncate">{list.owner.displayName}</span>
            </Link>
          ) : null}
        </div>
        {list.description ? (
          <p
            className={cn(
              "mt-1.5 text-[12px] leading-relaxed text-fg-muted",
              compactDensity ? "line-clamp-1" : "line-clamp-2"
            )}
          >
            {list.description}
          </p>
        ) : null}

        {list.tags.length > 0 ? (
          <div
            className={cn(
              "flex min-w-0 gap-1.5 overflow-hidden",
              compactDensity ? "mt-1.5" : "mt-2"
            )}
            aria-label="List tags"
          >
            {list.tags.slice(0, compactDensity ? 2 : 3).map(function (tag) {
              return (
                <span
                  key={tag}
                  className={cn(
                    "max-w-full truncate bg-sunken text-[10px] text-fg-muted",
                    compactDensity ? "rounded px-1.5 py-0.5" : "rounded-full px-2 py-0.5"
                  )}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          compactDensity
            ? "flex justify-end"
            : "col-span-2 flex items-center justify-between gap-2 border-t border-border pt-1"
        )}
      >
        {!compactDensity ? (
          <Link
            href={ROUTES.PROFILE(list.owner.username)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-sm text-fg-muted no-underline hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Avatar
              src={list.owner.avatarUrl}
              initial={list.owner.displayName.charAt(0)}
              size="sm"
              className="h-5 w-5 text-[9px]"
            />
            <span className="truncate text-[11px] font-medium">{list.owner.displayName}</span>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleLike}
          disabled={likePending || list.isOwner}
          aria-label={list.isOwner ? `${likeCount} likes` : isLiked ? "Unlike list" : "Like list"}
          aria-pressed={list.isOwner ? undefined : isLiked}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1.5 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default",
            compactDensity ? "min-h-9 min-w-9 rounded px-1.5" : "min-h-11 min-w-11 rounded-md px-2",
            isLiked ? "text-like" : "text-fg-muted enabled:hover:text-like"
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} aria-hidden />
          {likeCount > 0 ? formatCount(likeCount) : null}
        </button>
      </div>
    </article>
  );
}

function PublicListsSkeleton({ compactDensity }: { compactDensity: boolean }) {
  return (
    <div className="contents" aria-label="Loading lists">
      {Array.from({ length: 8 }, function (_, index) {
        return (
          <div
            key={index}
            className={cn(
              "grid motion-safe:animate-pulse",
              compactDensity
                ? "grid-cols-[92px_minmax(0,1fr)_minmax(2.75rem,auto)] gap-x-3 border-b border-border px-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)_minmax(3rem,auto)] sm:gap-x-4 sm:px-2 sm:py-4"
                : "grid-cols-[112px_minmax(0,1fr)] gap-4 rounded-3xl border border-border bg-elevated p-5"
            )}
          >
            <div className={cn("aspect-[1.12/1] shrink-0 rounded bg-sunken-2", compactDensity ? "w-[92px] sm:w-[160px]" : "w-[112px]")} />
            <div className={cn("w-full flex-1", compactDensity ? "py-1" : "py-2")}>
              <div className="h-3 w-1/4 rounded bg-sunken-2" />
              <div className={cn("w-3/4 rounded bg-sunken-2", compactDensity ? "mt-2 h-4" : "mt-3 h-5")} />
              <div className={cn("w-1/2 rounded bg-sunken-2", compactDensity ? "mt-2 h-3" : "mt-3 h-4")} />
            </div>
            {compactDensity ? <div className="h-9 w-9 rounded bg-sunken-2" /> : null}
          </div>
        );
      })}
    </div>
  );
}
