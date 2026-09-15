"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Filter, Grid2X2, LayoutGrid, LayoutList, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import type { FilmCatalogSort, FilmCatalogType, FilmListSummary } from "@35mm/types";
import { EmptyState } from "@/components/EmptyState";
import { TextFilterMenu } from "@/components/filters/TextFilterMenu";
import { useAuthPrompt } from "@/features/auth/components/AuthPromptProvider";
import { BROWSE_RAIL_ENABLED } from "@/lib/config/uiFlags";
import { DiscoverTabs } from "@/features/discover/components/DiscoverTabs";
import { useProfileLists, useListMutations } from "@/features/lists/hooks/useLists";
import type { CatalogFilmPayload, TmdbFilmPayload } from "@/features/lists/api/listsApi";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import {
  DISCOVER_DECADE_OPTIONS,
  DISCOVER_DURATION_OPTIONS,
  DISCOVER_LANGUAGE_OPTIONS,
} from "@/features/discover/lib/discoverExploreFilters";
import { DISCOVER_MOOD_OPTIONS } from "@/features/discover/lib/discoverMoodFilters";
import { ROUTES } from "@/lib/constants/routes";
import { resolveTmdbFilm, type FilmCatalogDisplayItem, type FilmCatalogFilters } from "../api/filmsApi";
import { useFilmsCatalog } from "../hooks/useFilmsCatalog";
import { useTmdbFilmsCatalog } from "../hooks/useTmdbFilmsCatalog";
import { catalogItemKey, mergeCatalogSources, preserveCatalogOrder } from "../lib/catalogOrdering";
import { FilmCatalogCard, FilmCatalogListRow } from "./FilmCatalogCard";

type FilmCatalogView = "list" | "grid" | "details";

const SORT_OPTIONS: Array<{ value: FilmCatalogSort; label: string }> = [
  { value: "popular", label: "Popular" },
  { value: "title_asc", label: "Title A–Z" },
  { value: "year_desc", label: "Release year: newest" },
  { value: "year_asc", label: "Release year: oldest" },
];

const TYPE_OPTIONS: Array<{ value: FilmCatalogType; label: string }> = [
  { value: "all", label: "All titles" },
  { value: "movie", label: "Movies" },
  { value: "tv_show", label: "TV shows" },
  { value: "web_series", label: "Web series" },
  { value: "short_film", label: "Short films (≤40m)" },
  { value: "documentary", label: "Documentaries" },
  { value: "mini_series", label: "Miniseries" },
];

const GENRE_OPTIONS = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary",
  "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery",
  "Romance", "Science Fiction", "Thriller", "War", "Western",
].map(function (genre) {
  return { value: genre, label: genre };
});

const VALID_SORTS = new Set<string>(SORT_OPTIONS.map(function (option) { return option.value; }));
const VALID_MOODS = new Set<string>(DISCOVER_MOOD_OPTIONS.map(function (option) { return option.id; }));
const VALID_TYPES = new Set<string>(TYPE_OPTIONS.map(function (option) { return option.value; }));
const VALID_DURATIONS = new Set<string>(DISCOVER_DURATION_OPTIONS.map(function (option) { return option.id; }));
const VALID_VIEWS = new Set<FilmCatalogView>(["list", "grid", "details"]);

function currentLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find(function (option) { return option.value === value; })?.label ?? value;
}

function mapOptions(options: readonly { id: string; label: string }[]) {
  return options.map(function (option) { return { value: option.id, label: option.label }; });
}

function sortTriggerLabel(sort: FilmCatalogSort) {
  if (sort === "title_asc") return "Title A-Z";
  if (sort === "year_desc") return "Newest";
  if (sort === "year_asc") return "Oldest";
  return "Popular";
}

function catalogFilmPayload(film: FilmCatalogDisplayItem): CatalogFilmPayload {
  return {
    title: film.title,
    year: film.year,
    posterUrl: film.posterUrl,
    genres: film.genres,
    director: film.director,
  };
}

function tmdbFilmPayload(film: FilmCatalogDisplayItem): TmdbFilmPayload | null {
  if (film.tmdbId == null || film.mediaType === "tv") return null;
  return {
    tmdbId: film.tmdbId,
    title: film.title,
    year: film.year,
    posterUrl: film.posterUrl,
    genres: film.genres,
  };
}

function userSelectableLists(lists: FilmListSummary[]) {
  return lists
    .filter(function (list) { return list.type !== "watchlist"; })
    .map(function (list) { return { id: list.id, title: list.title }; });
}

function FilmsSkeleton({ gridClassName }: { gridClassName: string }) {
  return (
    <div className={gridClassName} aria-hidden>
      {Array.from({ length: 18 }).map(function (_, index) {
        return (
          <div key={index}>
            <div className="aspect-[2/3] animate-pulse rounded-sm bg-skeleton" />
            <div className="mt-3 h-3 animate-pulse rounded bg-skeleton" />
            <div className="mt-2 h-2.5 w-2/3 animate-pulse rounded bg-skeleton" />
          </div>
        );
      })}
    </div>
  );
}

function FilmsFilterControls({
  activeFilterCount,
  advancedFilterCount,
  clearFilters,
  filters,
  searchDraft,
  setFilter,
  setSearchDraft,
  setView,
  submitSearch,
  view,
}: {
  activeFilterCount: number;
  advancedFilterCount: number;
  clearFilters: () => void;
  filters: FilmCatalogFilters;
  searchDraft: string;
  setFilter: (name: keyof FilmCatalogFilters, value: string) => void;
  setSearchDraft: (value: string) => void;
  setView: (view: FilmCatalogView) => void;
  submitSearch: (event: FormEvent<HTMLFormElement>) => void;
  view: FilmCatalogView;
}) {
  const menuClass = "h-9 px-1.5 text-[11px] tracking-normal";
  const compactMenuClass = "h-9 w-full justify-between rounded-[3px] px-2 text-[11px] tracking-normal";
  const searchId = "film-catalog-search";
  const searchActive = filters.q.length > 0;

  const advancedFilters = (
    <>
      <TextFilterMenu ariaLabel="Film mood" value={filters.mood} triggerClassName={menuClass}
        triggerLabel={filters.mood === "all" ? "Mood" : currentLabel(mapOptions(DISCOVER_MOOD_OPTIONS), filters.mood)}
        options={mapOptions(DISCOVER_MOOD_OPTIONS)} onValueChange={function (value) { setFilter("mood", value); }} />
      <TextFilterMenu ariaLabel="Film type" value={filters.type} triggerClassName={menuClass}
        triggerLabel={filters.type === "all" ? "Type" : currentLabel(TYPE_OPTIONS, filters.type)} options={TYPE_OPTIONS}
        onValueChange={function (value) { setFilter("type", value); }} />
      <TextFilterMenu ariaLabel="Film genre" value={filters.genre || "all"} triggerClassName={menuClass}
        triggerLabel={filters.genre || "Genre"} options={[{ value: "all", label: "Any genre" }, ...GENRE_OPTIONS]}
        onValueChange={function (value) { setFilter("genre", value === "all" ? "" : value); }} />
      <TextFilterMenu ariaLabel="Release decade" value={filters.decade ? filters.decade + "s" : "any"} triggerClassName={menuClass}
        triggerLabel={filters.decade ? filters.decade + "s" : "Decade"} options={mapOptions(DISCOVER_DECADE_OPTIONS)}
        onValueChange={function (value) { setFilter("decade", value === "any" ? "" : value.slice(0, 4)); }} />
      <TextFilterMenu ariaLabel="Film language" value={filters.language || "any"} triggerClassName={menuClass}
        triggerLabel={filters.language ? currentLabel(mapOptions(DISCOVER_LANGUAGE_OPTIONS), filters.language) : "Language"}
        options={mapOptions(DISCOVER_LANGUAGE_OPTIONS)} onValueChange={function (value) { setFilter("language", value === "any" ? "" : value); }} />
      <TextFilterMenu ariaLabel="Film runtime" value={filters.duration} triggerClassName={menuClass}
        triggerLabel={filters.duration === "any" ? "Runtime" : currentLabel(mapOptions(DISCOVER_DURATION_OPTIONS), filters.duration)}
        options={mapOptions(DISCOVER_DURATION_OPTIONS)} onValueChange={function (value) { setFilter("duration", value); }} />
    </>
  );

  return (
    <div className="flex w-full min-w-max items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <TextFilterMenu ariaLabel="Sort films" value={filters.sort} triggerClassName={menuClass}
          triggerLabel={sortTriggerLabel(filters.sort)} options={SORT_OPTIONS}
          onValueChange={function (value) { setFilter("sort", value); }} />
        <div className="hidden min-w-0 items-center gap-2 xl:flex">
          {advancedFilters}
        </div>
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger
            aria-label="More film filters"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-[3px] px-2 text-[11px] font-semibold uppercase tracking-normal text-fg-muted transition-colors hover:bg-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 xl:hidden"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            <span>Filters{advancedFilterCount > 0 ? ` ${advancedFilterCount}` : ""}</span>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              collisionPadding={12}
              className="z-50 flex w-[min(17rem,calc(100vw-2rem))] flex-col gap-1 rounded-[3px] border border-border-strong bg-elevated p-2 shadow-lg"
            >
              <TextFilterMenu ariaLabel="Film mood" value={filters.mood} triggerClassName={compactMenuClass}
                triggerLabel={filters.mood === "all" ? "Mood" : currentLabel(mapOptions(DISCOVER_MOOD_OPTIONS), filters.mood)}
                options={mapOptions(DISCOVER_MOOD_OPTIONS)} onValueChange={function (value) { setFilter("mood", value); }} />
              <TextFilterMenu ariaLabel="Film type" value={filters.type} triggerClassName={compactMenuClass}
                triggerLabel={filters.type === "all" ? "Type" : currentLabel(TYPE_OPTIONS, filters.type)} options={TYPE_OPTIONS}
                onValueChange={function (value) { setFilter("type", value); }} />
              <TextFilterMenu ariaLabel="Film genre" value={filters.genre || "all"} triggerClassName={compactMenuClass}
                triggerLabel={filters.genre || "Genre"} options={[{ value: "all", label: "Any genre" }, ...GENRE_OPTIONS]}
                onValueChange={function (value) { setFilter("genre", value === "all" ? "" : value); }} />
              <TextFilterMenu ariaLabel="Release decade" value={filters.decade ? filters.decade + "s" : "any"} triggerClassName={compactMenuClass}
                triggerLabel={filters.decade ? filters.decade + "s" : "Decade"} options={mapOptions(DISCOVER_DECADE_OPTIONS)}
                onValueChange={function (value) { setFilter("decade", value === "any" ? "" : value.slice(0, 4)); }} />
              <TextFilterMenu ariaLabel="Film language" value={filters.language || "any"} triggerClassName={compactMenuClass}
                triggerLabel={filters.language ? currentLabel(mapOptions(DISCOVER_LANGUAGE_OPTIONS), filters.language) : "Language"}
                options={mapOptions(DISCOVER_LANGUAGE_OPTIONS)} onValueChange={function (value) { setFilter("language", value === "any" ? "" : value); }} />
              <TextFilterMenu ariaLabel="Film runtime" value={filters.duration} triggerClassName={compactMenuClass}
                triggerLabel={filters.duration === "any" ? "Runtime" : currentLabel(mapOptions(DISCOVER_DURATION_OPTIONS), filters.duration)}
                options={mapOptions(DISCOVER_DURATION_OPTIONS)} onValueChange={function (value) { setFilter("duration", value); }} />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="h-9 shrink-0 rounded-[3px] px-1.5 text-[11px] font-semibold uppercase tracking-normal text-film-red hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          >
            Clear {activeFilterCount}
          </button>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger
            aria-label="Search films"
            title="Search films"
            className={
              searchActive
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-fg text-bg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] text-fg-muted transition-colors hover:bg-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            }
          >
            <Search className="h-4 w-4" aria-hidden />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              collisionPadding={12}
              className="z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[3px] border border-border-strong bg-elevated p-2 shadow-lg"
            >
              <form onSubmit={submitSearch} role="search" className="flex h-10 items-center gap-2 rounded-[3px] border border-border bg-sunken px-2.5">
                <Search className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                <label htmlFor={searchId} className="sr-only">Search movies and series</label>
                <input
                  id={searchId}
                  value={searchDraft}
                  onChange={function (event) { setSearchDraft(event.target.value); }}
                  placeholder="Search films"
                  maxLength={100}
                  className="h-full min-w-0 flex-1 bg-transparent text-[13px] font-medium text-fg outline-none ring-0 outline-0 placeholder:text-fg-subtle"
                />
                {searchDraft !== filters.q ? (
                  <button
                    type="submit"
                    className="shrink-0 rounded-[3px] bg-fg px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-normal text-bg hover:opacity-85"
                  >
                    Search
                  </button>
                ) : null}
              </form>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <div
          className="flex shrink-0 items-center rounded-full border border-border bg-sunken p-0.5"
          role="group"
          aria-label="Film view"
        >
          <ViewToggleButton active={view === "grid"} label="Grid" onClick={function () { setView("grid"); }}>
            <Grid2X2 className="h-3.5 w-3.5" aria-hidden />
          </ViewToggleButton>
          <ViewToggleButton active={view === "details"} label="Grid with info" onClick={function () { setView("details"); }}>
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
          </ViewToggleButton>
          <ViewToggleButton active={view === "list"} label="List" onClick={function () { setView("list"); }}>
            <LayoutList className="h-3.5 w-3.5" aria-hidden />
          </ViewToggleButton>
        </div>
      </div>
    </div>
  );
}

export function FilmsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const { requireAuth } = useAuthPrompt();
  const currentUserQuery = useCurrentUserProfile();
  const profileUsername = currentUserQuery.data?.username ?? "";
  const profileListsQuery = useProfileLists(profileUsername, "updated");
  const listMutations = useListMutations(profileUsername);
  const stableOrderRef = useRef<{ queryKey: string; keys: string[] }>({ queryKey: "", keys: [] });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const filters = useMemo<FilmCatalogFilters>(function () {
    var sortValue = searchParams.get("sort") as FilmCatalogSort | null;
    var moodValue = searchParams.get("mood") ?? "all";
    var typeValue = searchParams.get("type") ?? "all";
    var durationValue = searchParams.get("duration") ?? "any";
    return {
      q: (searchParams.get("q") ?? "").trim(),
      sort: sortValue && VALID_SORTS.has(sortValue) ? sortValue : "popular",
      mood: VALID_MOODS.has(moodValue) ? moodValue : "all",
      type: (VALID_TYPES.has(typeValue) ? typeValue : "all") as FilmCatalogType,
      genre: searchParams.get("genre") ?? "",
      decade: searchParams.get("decade") ?? "",
      language: searchParams.get("language") ?? "",
      duration: VALID_DURATIONS.has(durationValue) ? durationValue : "any",
    };
  }, [searchParams]);

  const [searchDraft, setSearchDraft] = useState(filters.q);
  useEffect(function syncSearchField() {
    setSearchDraft(filters.q);
  }, [filters.q]);

  const filmsQuery = useFilmsCatalog(filters);
  const tmdbQuery = useTmdbFilmsCatalog(filters);
  const localFilms = useMemo(function () {
    return (filmsQuery.data?.pages.flatMap(function (page) { return page.items; }) ?? [])
      .map(function (film): FilmCatalogDisplayItem { return { ...film, source: "35mm" }; });
  }, [filmsQuery.data]);
  const tmdbFilms = useMemo(function () {
    var seen = new Set<string>();
    return (tmdbQuery.data?.pages.flatMap(function (page) { return page.items; }) ?? [])
      .filter(function (film) {
        var identity = `${film.mediaType}:${film.tmdbId}`;
        if (film.tmdbId == null || seen.has(identity)) return false;
        seen.add(identity);
        return true;
      });
  }, [tmdbQuery.data]);
  const catalogQueryKey = useMemo(function () { return JSON.stringify(filters); }, [filters]);
  const films = useMemo(function () {
    var candidates = mergeCatalogSources(localFilms, tmdbFilms);
    var initialSourcesReady = !filmsQuery.isLoading && !tmdbQuery.isLoading;
    if (stableOrderRef.current.queryKey !== catalogQueryKey) {
      if (!initialSourcesReady) return candidates;
      stableOrderRef.current = { queryKey: catalogQueryKey, keys: [] };
    }
    var stable = preserveCatalogOrder(stableOrderRef.current.keys, candidates);
    stableOrderRef.current.keys = stable.keys;
    return stable.items;
  }, [catalogQueryKey, filmsQuery.isLoading, localFilms, tmdbFilms, tmdbQuery.isLoading]);
  const hasMoreFilms = Boolean(filmsQuery.hasNextPage || tmdbQuery.hasNextPage);
  const isFetchingMore = filmsQuery.isFetchingNextPage || tmdbQuery.isFetchingNextPage;
  const [openingFilmId, setOpeningFilmId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [addingListTarget, setAddingListTarget] = useState<{ filmKey: string; listId: string } | null>(null);
  var viewParam = searchParams.get("view") as FilmCatalogView | null;
  var view: FilmCatalogView = viewParam && VALID_VIEWS.has(viewParam) ? viewParam : "grid";
  const ownListOptions = useMemo(function () {
    return userSelectableLists(profileListsQuery.data?.pages.flatMap(function (page) { return page.items; }) ?? []);
  }, [profileListsQuery.data]);

  async function openFilm(film: FilmCatalogDisplayItem) {
    if (film.source === "35mm" || film.tmdbId == null || openingFilmId) return;
    if (film.mediaType === "tv") {
      router.push(ROUTES.TITLE("tv", film.title));
      return;
    }
    setOpeningFilmId(film.id);
    setOpenError(null);
    try {
      await resolveTmdbFilm({
        tmdbId: film.tmdbId,
        title: film.title,
        year: film.year,
        posterUrl: film.posterUrl,
        genres: film.genres,
        runtime: film.runtime,
        language: film.language,
        country: film.country,
      }, await getToken());
      router.push(ROUTES.TITLE("movie", film.title));
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : "Film could not be opened");
      setOpeningFilmId(null);
    }
  }

  function setFilter(name: keyof FilmCatalogFilters, value: string) {
    var next = new URLSearchParams(searchParams.toString());
    var defaults: Record<keyof FilmCatalogFilters, string> = {
      q: "",
      sort: "popular",
      mood: "all",
      type: "all",
      genre: "",
      decade: "",
      language: "",
      duration: "any",
    };
    if (!value || value === defaults[name]) next.delete(name);
    else next.set(name, value);
    router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilter("q", searchDraft.trim());
  }

  function clearFilters() {
    setSearchDraft("");
    var next = new URLSearchParams();
    if (view !== "grid") next.set("view", view);
    router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  }

  function setView(nextView: FilmCatalogView) {
    var next = new URLSearchParams(searchParams.toString());
    if (nextView === "grid") next.delete("view");
    else next.set("view", nextView);
    router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  }

  function requestListAuth() {
    requireAuth(function () {}, {
      message: "Log in to add titles to your lists.",
    });
  }

  function addToList(film: FilmCatalogDisplayItem, listId: string) {
    requireAuth(function () {
      var filmKey = catalogItemKey(film);
      setAddingListTarget({ filmKey, listId });
      var filmPayload = tmdbFilmPayload(film);
      listMutations.addEntry.mutate({
        id: listId,
        filmId: film.source === "35mm" ? film.id : undefined,
        film: filmPayload ?? undefined,
        catalogFilm: film.source !== "35mm" && filmPayload === null ? catalogFilmPayload(film) : undefined,
      }, {
        onSettled: function () {
          setAddingListTarget(function (current) {
            return current?.filmKey === filmKey && current.listId === listId ? null : current;
          });
        },
      });
    }, {
      message: "Log in to add titles to your lists.",
    });
  }

  useEffect(function () {
    if (!hasMoreFilms || isFetchingMore) return;
    var el = loadMoreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    var observer = new IntersectionObserver(function (entries) {
      var entry = entries[0];
      if (!entry || !entry.isIntersecting) return;

      if (filmsQuery.hasNextPage && !filmsQuery.isFetchingNextPage) {
        void filmsQuery.fetchNextPage();
      }
      if (tmdbQuery.hasNextPage && !tmdbQuery.isFetchingNextPage) {
        void tmdbQuery.fetchNextPage();
      }
    }, {
      rootMargin: "1400px 0px",
      threshold: 0.01,
    });

    observer.observe(el);
    return function () {
      observer.disconnect();
    };
  }, [
    filmsQuery.hasNextPage,
    filmsQuery.fetchNextPage,
    filmsQuery.isFetchingNextPage,
    hasMoreFilms,
    isFetchingMore,
    tmdbQuery.fetchNextPage,
    tmdbQuery.hasNextPage,
    tmdbQuery.isFetchingNextPage,
  ]);

  var activeFilterCount = [
    filters.q,
    filters.sort === "popular" ? "" : filters.sort,
    filters.mood === "all" ? "" : filters.mood,
    filters.type === "all" ? "" : filters.type,
    filters.genre,
    filters.decade,
    filters.language,
    filters.duration === "any" ? "" : filters.duration,
  ].filter(Boolean).length;
  var advancedFilterCount = [
    filters.mood === "all" ? "" : filters.mood,
    filters.type === "all" ? "" : filters.type,
    filters.genre,
    filters.decade,
    filters.language,
    filters.duration === "any" ? "" : filters.duration,
  ].filter(Boolean).length;

  const pageGutterClass = BROWSE_RAIL_ENABLED
    ? "w-full px-4 pb-16 sm:px-6 lg:px-0"
    : "mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-10";
  const skeletonGridClass = BROWSE_RAIL_ENABLED
    ? "grid grid-cols-2 gap-x-2 gap-y-5 py-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
    : "grid grid-cols-2 gap-1 py-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6";
  const compactGridClass = BROWSE_RAIL_ENABLED
    ? "grid grid-cols-3 gap-x-1.5 gap-y-4 py-7 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-8"
    : "grid grid-cols-3 gap-1 py-7 sm:grid-cols-4 sm:gap-1 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8";
  const detailGridClass = BROWSE_RAIL_ENABLED
    ? "grid grid-cols-2 gap-x-2 gap-y-5 py-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6"
    : "grid grid-cols-2 gap-1 py-7 sm:grid-cols-3 sm:gap-1 md:grid-cols-4 xl:grid-cols-6";

  return (
    <div className="min-h-full w-full bg-bg">
      {!BROWSE_RAIL_ENABLED ? <DiscoverTabs active="films" /> : null}
      <div className={pageGutterClass}>
        <div className="border-b border-border py-2">
          <div
            role="region"
            className="scrollbar-hide overflow-x-auto"
            aria-label="Film filters"
          >
            <FilmsFilterControls
              activeFilterCount={activeFilterCount}
              advancedFilterCount={advancedFilterCount}
              clearFilters={clearFilters}
              filters={filters}
              searchDraft={searchDraft}
              setFilter={setFilter}
              setSearchDraft={setSearchDraft}
              setView={setView}
              submitSearch={submitSearch}
              view={view}
            />
          </div>
        </div>

        {openError ? (
          <div role="alert" className="border-b border-film-red/30 bg-film-red/5 px-3 py-2 text-[12px] text-film-red">
            {openError}
          </div>
        ) : null}

        {filmsQuery.isError !== tmdbQuery.isError ? (
          <p role="status" className="border-b border-border py-2 text-[11px] text-fg-muted">
            One catalog source is unavailable. Showing results from the other source.
          </p>
        ) : null}

        {filmsQuery.isLoading || tmdbQuery.isLoading ? (
          <FilmsSkeleton gridClassName={skeletonGridClass} />
        ) : filmsQuery.isError && tmdbQuery.isError ? (
          <EmptyState size="lg" icon={<Search className="h-7 w-7" aria-hidden />} headline="Films didn’t load"
            subline="Check your connection, then try the catalog again."
            primaryCta={{ label: "Try again", onClick: function () {
              void filmsQuery.refetch();
              void tmdbQuery.refetch();
            } }} />
        ) : films.length === 0 ? (
          <EmptyState size="lg" icon={<Filter className="h-7 w-7" aria-hidden />} headline="No films match"
            subline="Try a broader search or remove one of your filters."
            primaryCta={{ label: "Clear filters", onClick: clearFilters }} />
        ) : (
          <>
            {view === "list" ? (
              <div className="space-y-2.5 py-4">
                {films.map(function (film, index) {
                  var filmKey = catalogItemKey(film);
                  return <FilmCatalogListRow
                    key={filmKey}
                    addingListId={addingListTarget?.filmKey === filmKey ? addingListTarget.listId : null}
                    canAddToList={Boolean(isSignedIn)}
                    film={film}
                    isOpening={openingFilmId === film.id}
                    listOptions={ownListOptions}
                    listOptionsLoading={currentUserQuery.isLoading || profileListsQuery.isLoading}
                    onAddToList={addToList}
                    onOpen={openFilm}
                    onRequestListAuth={requestListAuth}
                    rank={index + 1}
                  />;
                })}
              </div>
            ) : (
              <div className={view === "grid" ? compactGridClass : detailGridClass}>
                {films.map(function (film) {
                  return <FilmCatalogCard key={catalogItemKey(film)} film={film} isOpening={openingFilmId === film.id} onOpen={openFilm} showInfo={view === "details"} />;
                })}
              </div>
            )}
            <div className="flex min-h-20 items-center justify-center border-t border-border py-5">
              {hasMoreFilms ? (
                <div ref={loadMoreRef} className="min-h-12 flex items-center justify-center py-2">
                  {isFetchingMore ? <p className="text-[11px] uppercase tracking-[0.12em] text-fg-muted">Loading more titles…</p> : <span />}
                </div>
              ) : (
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">End of results</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ViewToggleButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={active
        ? "flex h-7 w-8 items-center justify-center rounded-full bg-bg text-fg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        : "flex h-7 w-8 items-center justify-center rounded-full text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"}
    >
      {children}
    </button>
  );
}
