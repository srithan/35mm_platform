"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Heart, Plus, Rows3, Search, X } from "lucide-react";
import type { FilmListSummary } from "@35mm/types";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { FilmPoster } from "@/components/FilmPoster";
import { TextFilterMenu } from "@/components/filters/TextFilterMenu";
import { DiscoverTabs } from "@/features/discover/components/DiscoverTabs";
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
  const { isSignedIn } = useAuth();

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
    if (!isSignedIn) {
      router.push(ROUTES.AUTH_LOGIN);
      return;
    }
    await mutations.toggleLike.mutateAsync({ id: list.id, isLiked: list.isLiked });
  }

  function openCreateList() {
    if (!isSignedIn) {
      router.push(ROUTES.AUTH_LOGIN);
      return;
    }
    setEditorOpen(true);
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

  return (
    <div className="min-h-full w-full bg-bg">
      <DiscoverTabs active="lists" />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-10">
        <h1 className="sr-only">Lists</h1>
        <div className="mb-7 flex flex-col gap-x-6 border-b border-border py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative my-1 w-full sm:order-last sm:ml-auto sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <input
              type="search"
              aria-label="Search lists"
              placeholder="Search lists…"
              maxLength={100}
              value={search}
              onChange={function (event) { setSearch(event.target.value); }}
              className="h-10 w-full rounded-lg border border-border bg-sunken pl-9 pr-9 text-[13px] text-fg placeholder:text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search ? <button type="button" aria-label="Clear search" onClick={function () { setSearch(""); setQuery(""); }} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded text-fg-muted hover:text-fg focus-visible:outline-accent"><X className="h-4 w-4" aria-hidden /></button> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-5">
          <TextFilterMenu
            ariaLabel="Sort lists"
            value={sort}
            triggerLabel={
              "Sort: " + (SORT_OPTIONS.find((option) => option.id === sort)?.label ?? "Popular")
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
            triggerLabel={format === "all" ? "All types" : format === "ranked" ? "Ranked" : "Unranked"}
            options={[{ value: "all", label: "All types" }, { value: "ranked", label: "Ranked" }, { value: "unranked", label: "Unranked" }]}
            onValueChange={function (value) { setFormat(value as typeof format); }}
          />
          <TextFilterMenu
            ariaLabel="Filter list size"
            value={size}
            triggerLabel={size === "all" ? "Any size" : size === "short" ? "Under 10 films" : size === "medium" ? "10–50 films" : "Over 50 films"}
            options={[{ value: "all", label: "Any size" }, { value: "short", label: "Under 10 films" }, { value: "medium", label: "10–50 films" }, { value: "long", label: "Over 50 films" }]}
            onValueChange={function (value) { setSize(value as typeof size); }}
          />
          {search || format !== "all" || size !== "all" ? (
            <button type="button" className="text-[12px] text-accent hover:underline" onClick={function () { setSearch(""); setQuery(""); setFormat("all"); setSize("all"); }}>Reset filters</button>
          ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        {listsQuery.isLoading ? (
          <PublicListsSkeleton />
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
  list,
  onToggleLike,
}: {
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
    <article className="group grid min-w-0 grid-cols-[112px_minmax(0,1fr)] items-start gap-x-4 gap-y-3 rounded-3xl border border-border bg-elevated p-5 shadow-[0_2px_12px_rgba(0,0,0,0.045)] transition-[background-color,box-shadow] hover:bg-hover hover:shadow-[0_5px_18px_rgba(0,0,0,0.07)]">
      <Link
        href={ROUTES.LIST(list.id)}
        aria-label={`Open ${list.title} by ${list.owner.displayName}`}
        className="relative isolate block aspect-[1.12/1] w-[112px] shrink-0 rounded-sm no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
      >
        {posters.map(function (posterUrl, index) {
          return (
            <div
              key={index}
              className="absolute top-1/2 w-[58%] -translate-y-1/2 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5"
              style={{ left: `${index * 14}%`, zIndex: 4 - index, scale: `${1 - index * 0.045}` }}
            >
              <FilmPoster
                src={posterUrl}
                alt=""
                size="xl"
                className="w-full rounded border border-bg shadow-[3px_1px_6px_rgba(0,0,0,0.16)]"
              />
            </div>
          );
        })}
      </Link>

      <div className="flex w-full min-w-0 flex-1 flex-col">
        <h2>
          <Link
            href={ROUTES.LIST(list.id)}
            className="line-clamp-3 break-words rounded-sm font-display-discover text-[22px] font-normal leading-[1.2] text-fg [text-wrap:pretty] no-underline hover:text-fg-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {list.title}
          </Link>
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
          <span>{formatCount(list.entryCount)} {list.entryCount === 1 ? "film" : "films"}</span>
          {list.isRanked ? <span className="flex items-center gap-1"><Rows3 className="h-3 w-3" aria-hidden />Ranked</span> : null}
        </div>
        {list.description ? (
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-fg-muted">
            {list.description}
          </p>
        ) : null}

        {list.tags.length > 0 ? (
          <div className="mt-2 flex min-w-0 gap-2 overflow-hidden" aria-label="List tags">
            {list.tags.slice(0, 3).map(function (tag) {
              return <span key={tag} className="max-w-full truncate rounded-full bg-sunken px-2 py-0.5 text-[10px] text-fg-muted">{tag}</span>;
            })}
          </div>
        ) : null}
      </div>
        <div className="col-span-2 flex items-center justify-between gap-2 border-t border-border pt-1">
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
          <button
            type="button"
            onClick={handleLike}
            disabled={likePending || list.isOwner}
            aria-label={list.isOwner ? `${likeCount} likes` : isLiked ? "Unlike list" : "Like list"}
            aria-pressed={list.isOwner ? undefined : isLiked}
            className={cn(
              "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-default",
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

function PublicListsSkeleton() {
  return (
    <div className="contents" aria-label="Loading lists">
      {Array.from({ length: 8 }, function (_, index) {
        return (
          <div key={index} className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 rounded-3xl border border-border bg-elevated p-5 motion-safe:animate-pulse">
            <div className="aspect-[1.12/1] w-[112px] shrink-0 rounded bg-sunken-2" />
            <div className="w-full flex-1 py-2">
              <div className="h-3 w-1/4 rounded bg-sunken-2" />
              <div className="mt-3 h-5 w-3/4 rounded bg-sunken-2" />
              <div className="mt-3 h-4 w-1/2 rounded bg-sunken-2" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
