"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { cn } from "@/lib/utils/cn";
import { FilterSidebarPageShell } from "@/components/layout/FilterSidebarPageShell";
import {
  sidebarFilterSectionTitle,
  sidebarFilterListWrap,
  sidebarFilterRowBase,
} from "@/components/filters/sidebarFilterStyles";
import type { CommunitySummary } from "../types/community";
import { useCommunities } from "../hooks/useCommunities";
import { CommunityGridCard } from "./CommunityGridCard";

type CommunityCategory =
  | "all"
  | "cinema-woods"
  | "tv-shows"
  | "popular-movies"
  | "genres"
  | "festivals"
  | "mature";

const CATEGORY_ITEMS: readonly { id: CommunityCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "cinema-woods", label: "Cinema Woods" },
  { id: "tv-shows", label: "TV Shows" },
  { id: "popular-movies", label: "Popular Movies" },
  { id: "genres", label: "Genres" },
  { id: "festivals", label: "Festivals" },
  { id: "mature", label: "Mature 18+" },
] as const;

function matchesCategory(
  community: CommunitySummary,
  category: CommunityCategory
): boolean {
  const normalizedName = community.name.toLowerCase();
  const normalizedTopics = community.topics.map((topic) => topic.toLowerCase());

  if (category === "all") return true;
  if (category === "mature") return community.isMature;

  if (category === "cinema-woods") {
    return [
      "bollywood",
      "hollywood",
      "tollywood",
      "kollywood",
      "mollywood",
    ].some((keyword) => normalizedName.includes(keyword));
  }

  if (category === "tv-shows") {
    return (
      normalizedName.includes("tv") ||
      normalizedTopics.some((topic) => topic.includes("tv"))
    );
  }

  if (category === "popular-movies") {
    return community.memberCount >= 250_000;
  }

  if (category === "genres") {
    return ["horror", "noir", "sci-fi", "rom-com"].some((keyword) =>
      normalizedName.includes(keyword)
    );
  }

  if (category === "festivals") {
    return normalizedTopics.some((topic) =>
      ["festival", "awards", "industry"].some((needle) => topic.includes(needle))
    );
  }

  return true;
}

export function CommunitiesContent() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useCommunities();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<CommunityCategory>("all");
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>([]);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const communities = data?.pages.flatMap((page) => page.communities) ?? [];
  const filteredCommunities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return communities.filter((community) => {
      if (!matchesCategory(community, activeCategory)) return false;
      if (!normalizedSearch) return true;

      return (
        community.name.toLowerCase().includes(normalizedSearch) ||
        community.description.toLowerCase().includes(normalizedSearch) ||
        community.topics.some((topic) =>
          topic.toLowerCase().includes(normalizedSearch)
        )
      );
    });
  }, [activeCategory, communities, searchTerm]);

  const activeCategoryLabel = useMemo(
    () => CATEGORY_ITEMS.find((item) => item.id === activeCategory)?.label ?? "All",
    [activeCategory]
  );

  useEffect(
    function () {
      const el = loadMoreSentinelRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        function (entries) {
          const entry = entries[0];
          if (
            entry &&
            entry.isIntersecting &&
            hasNextPage &&
            !isFetchingNextPage
          ) {
            void fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(el);
      return function () {
        observer.disconnect();
      };
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  if (isLoading) return <CommunitiesSkeleton />;

  if (isError) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-fg-muted">{(error as Error).message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 text-sm text-accent underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <FilterSidebarPageShell
        rowClassName="flex flex-col lg:flex-row lg:gap-8 px-4 md:px-6 pb-8 pt-4 md:pt-5 lg:pt-0"
        preset="communities"
        mainClassName="flex-1 min-w-0 lg:ml-[352px] py-1"
        sidebarHeader={
          <>
            <h1 className="text-[20px] lg:text-[22px] leading-tight text-fg font-semibold">
              Communities
            </h1>
            <p className="mt-1.5 text-[12px] text-fg-muted leading-snug">
              Find your people across cinema woods, genres, popular films, and TV.
            </p>
          </>
        }
        sidebarBody={
          <div className="space-y-5">
            <SearchBar
              placeholder="Search communities..."
              onSearch={setSearchTerm}
              variant="inline"
              size="compact"
              category="communities"
              showDropdown={false}
            />

            <div>
              <p className={cn(sidebarFilterSectionTitle, "mb-2")}>Browse by</p>
              <div className={cn(sidebarFilterListWrap, "shadow-sm flex flex-col")}>
                {CATEGORY_ITEMS.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={sidebarFilterRowBase(activeCategory === category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {(activeCategory !== "all" || searchTerm.trim().length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setSearchTerm("");
                }}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        }
      >
          <div className="mb-4 flex items-center justify-between gap-2 text-[12px] text-fg-muted">
            <span>
              {filteredCommunities.length} communities
              {activeCategory !== "all" ? ` in ${activeCategoryLabel}` : ""}
            </span>
          </div>

          {filteredCommunities.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[13px] text-fg-muted">
                No communities match your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
              {filteredCommunities.map(function (community) {
                return (
                  <CommunityGridCard
                    key={community.id}
                    community={community}
                    joined={joinedCommunityIds.includes(community.id)}
                    onJoinToggle={function (communityId) {
                      setJoinedCommunityIds(function (prev) {
                        return prev.includes(communityId)
                          ? prev.filter(function (id) {
                              return id !== communityId;
                            })
                          : prev.concat([communityId]);
                      });
                    }}
                  />
                );
              })}
            </div>
        )}

          {hasNextPage ? (
            <div
              ref={loadMoreSentinelRef}
              className="h-12 flex items-center justify-center pt-2"
              aria-hidden
            >
              {isFetchingNextPage ? (
                <span className="text-[12px] text-fg-muted">Loading more…</span>
              ) : null}
            </div>
          ) : null}
      </FilterSidebarPageShell>
    </div>
  );
}

function CommunitiesSkeleton() {
  return (
    <div className="min-h-full animate-pulse">
      <div className="flex flex-col lg:flex-row lg:gap-8 px-4 md:px-6 py-4">
        <aside className="w-full lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-border pb-6 lg:pr-6 mb-6 lg:mb-0 space-y-4">
          <div className="h-7 w-28 rounded bg-skeleton-strong" />
          <div className="h-3 w-full max-w-[240px] rounded bg-skeleton" />
          <div className="h-4 w-16 rounded bg-skeleton" />
          <div className="h-10 w-full rounded-md bg-skeleton" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-9 w-full rounded-lg bg-skeleton" />
            ))}
          </div>
        </aside>
        <div className="flex-1 min-w-0">
          <div className="mb-4 h-3 w-32 rounded bg-skeleton" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
            {Array.from({ length: 9 }).map(function (_, index) {
              return (
                <div
                  key={index}
                  className="aspect-square rounded-md bg-skeleton-strong animate-pulse ring-1 ring-border/40"
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
