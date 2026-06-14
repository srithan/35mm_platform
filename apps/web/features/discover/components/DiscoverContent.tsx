"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { BodyPortal } from "@/components/BodyPortal/BodyPortal";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils/cn";
import { useScrollLock } from "@/lib/hooks/useScrollLock";
import type { DiscoverTab } from "./DiscoverTabs";
import { ExploreTabContent } from "./ExploreTabContent";
import { NowPlayingTabContent } from "./NowPlayingTabContent";
import { TVShowsTabContent } from "./TVShowsTabContent";
import { GenreFilterStrip } from "./GenreFilterStrip";
import { DiscoverMoodFilterStrip } from "./DiscoverMoodFilterStrip";
import { DiscoverExploreMoreFilters } from "./DiscoverExploreMoreFilters";
import { useGenres } from "../hooks/useDiscoverData";
import type { TMDBMovie } from "@/lib/tmdb/types";
import { sidebarFilterSectionTitle } from "@/components/filters/sidebarFilterStyles";
import type { DiscoverMoodId } from "../lib/discoverMoodFilters";
import { DEFAULT_DISCOVER_EXPLORE_FILTERS } from "../lib/discoverExploreFilters";
import { tmdbItemToTitlePath } from "@/lib/title/paths";

function exploreFilterCount(
  genreId: number | null,
  moodId: DiscoverMoodId,
  filters: typeof DEFAULT_DISCOVER_EXPLORE_FILTERS
) {
  let count = 0;
  if (genreId !== null) count++;
  if (moodId !== "all") count++;
  if (filters.decadeId !== DEFAULT_DISCOVER_EXPLORE_FILTERS.decadeId) count++;
  if (filters.languageId !== DEFAULT_DISCOVER_EXPLORE_FILTERS.languageId) count++;
  if (filters.durationId !== DEFAULT_DISCOVER_EXPLORE_FILTERS.durationId) count++;
  if (filters.certificationId !== DEFAULT_DISCOVER_EXPLORE_FILTERS.certificationId) count++;
  if (filters.typeId !== DEFAULT_DISCOVER_EXPLORE_FILTERS.typeId) count++;
  if (
    filters.ratingPresetId !== DEFAULT_DISCOVER_EXPLORE_FILTERS.ratingPresetId
  ) {
    count++;
  }
  return count;
}

export function DiscoverContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DiscoverTab>("Explore");
  const [searchQuery, setSearchQuery] = useState("");
  const [genreId, setGenreId] = useState<number | null>(null);
  const [moodId, setMoodId] = useState<DiscoverMoodId>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exploreFilters, setExploreFilters] = useState(
    DEFAULT_DISCOVER_EXPLORE_FILTERS
  );
  const { genres } = useGenres();
  const activeFilterCount = exploreFilterCount(genreId, moodId, exploreFilters);

  const goToTitle = function (film: TMDBMovie) {
    router.push(tmdbItemToTitlePath(film), { scroll: true });
  };

  const handleSearch = function (query: string) {
    setSearchQuery(query);
    if (query.trim().length > 0 && activeTab !== "Explore") {
      setActiveTab("Explore");
    }
  };

  const clearFilters = function () {
    setGenreId(null);
    setMoodId("all");
    setExploreFilters(DEFAULT_DISCOVER_EXPLORE_FILTERS);
  };

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <p className={cn(sidebarFilterSectionTitle, "mb-2.5")}>Mood</p>
        <DiscoverMoodFilterStrip activeId={moodId} onSelect={setMoodId} />
      </div>
      <div>
        <p className={cn(sidebarFilterSectionTitle, "mb-2.5")}>Genre</p>
        <GenreFilterStrip
          genres={genres}
          activeId={genreId}
          onSelect={setGenreId}
          variant="sidebar"
        />
      </div>
      <DiscoverExploreMoreFilters
        filters={exploreFilters}
        setFilters={setExploreFilters}
      />
    </div>
  );

  return (
    <div className="min-h-full w-full bg-bg md:max-w-none md:mx-0">
      <div className="w-full px-4 pb-10 pt-safe lg:pt-0">
        <header className="flex flex-col gap-4 border-b border-border py-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-fg md:text-[26px]">
              Discover
            </h1>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-fg-muted">
              Start with the films. Refine the mood, era, language, and type when
              you want the search to get more personal.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:min-w-[440px]">
            <div className="min-w-0 flex-1">
              <SearchBar
                placeholder="Search films, directors, actors..."
                onSearch={handleSearch}
                category="films"
                variant="inline"
                size="compact"
                showDropdown={false}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={function () {
                setFiltersOpen(true);
                if (activeTab !== "Explore") setActiveTab("Explore");
              }}
              className="h-10 shrink-0 rounded-full px-4"
              aria-label="Open discovery filters"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              <span>Refine</span>
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fg px-1.5 text-[10px] font-semibold text-bg">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>
        </header>

        <main className="min-w-0">
          {activeTab === "Explore" ? (
            <ExploreTabContent
              onOpenDetail={goToTitle}
              searchQuery={searchQuery}
              genreId={genreId}
              moodId={moodId}
              exploreFilters={exploreFilters}
              activeFilterCount={activeFilterCount}
              onClearFilters={clearFilters}
            />
          ) : null}
          {activeTab === "TV Shows" ? (
            <TVShowsTabContent onOpenDetail={goToTitle} />
          ) : null}
          {activeTab === "Now Playing" ? (
            <NowPlayingTabContent onOpenDetail={goToTitle} />
          ) : null}
        </main>
      </div>

      <DiscoverFilterDrawer
        open={filtersOpen}
        activeFilterCount={activeFilterCount}
        onClose={function () {
          setFiltersOpen(false);
        }}
        onClear={clearFilters}
      >
        {filterPanel}
      </DiscoverFilterDrawer>
    </div>
  );
}

interface DiscoverFilterDrawerProps {
  open: boolean;
  activeFilterCount: number;
  onClose: () => void;
  onClear: () => void;
  children: ReactNode;
}

function DiscoverFilterDrawer({
  open,
  activeFilterCount,
  onClose,
  onClear,
  children,
}: DiscoverFilterDrawerProps) {
  useScrollLock(open);

  useEffect(
    function () {
      if (!open) return;

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") onClose();
      }

      window.addEventListener("keydown", handleKeyDown);
      return function () {
        window.removeEventListener("keydown", handleKeyDown);
      };
    },
    [onClose, open]
  );

  if (!open) return null;

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[var(--z-modal)] font-sans">
        <button
          type="button"
          className="absolute inset-0 cursor-default bg-black/35 backdrop-blur-[2px]"
          aria-label="Close discovery filters"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Discovery filters"
          className={cn(
            "absolute left-0 top-0 flex h-full w-full max-w-[390px] flex-col overflow-hidden",
            "border-r border-border bg-bg shadow-2xl"
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p className="text-[15px] font-semibold leading-tight text-fg">
                Refine discovery
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
                Tune the browse without pulling focus from the films.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-hover hover:text-fg"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-5">
            {children}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={activeFilterCount === 0}
              className="rounded-full"
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onClose}
              className="rounded-full px-5"
            >
              Show films
            </Button>
          </div>
        </aside>
      </div>
    </BodyPortal>
  );
}
