"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Grid2X2, LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import type { FilmCatalogSort, FilmCatalogType } from "@35mm/types";
import { EmptyState } from "@/components/EmptyState";
import { TextFilterMenu } from "@/components/filters/TextFilterMenu";
import { DiscoverTabs } from "@/features/discover/components/DiscoverTabs";
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

function FilmsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 py-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 xl:grid-cols-6" aria-hidden>
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

export function FilmsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const stableOrderRef = useRef<{ queryKey: string; keys: string[] }>({ queryKey: "", keys: [] });

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
  const tmdbTotalResults = tmdbQuery.data?.pages[0]?.totalResults ?? null;
  const hasMoreFilms = Boolean(filmsQuery.hasNextPage || tmdbQuery.hasNextPage);
  const isFetchingMore = filmsQuery.isFetchingNextPage || tmdbQuery.isFetchingNextPage;
  const [openingFilmId, setOpeningFilmId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  var viewParam = searchParams.get("view") as FilmCatalogView | null;
  var view: FilmCatalogView = viewParam && VALID_VIEWS.has(viewParam) ? viewParam : "details";

  async function openFilm(film: FilmCatalogDisplayItem) {
    if (film.source === "35mm" || film.tmdbId == null || openingFilmId) return;
    if (film.mediaType === "tv") {
      router.push(ROUTES.TITLE("tv", String(film.tmdbId)));
      return;
    }
    setOpeningFilmId(film.id);
    setOpenError(null);
    try {
      var resolved = await resolveTmdbFilm({
        tmdbId: film.tmdbId,
        title: film.title,
        year: film.year,
        posterUrl: film.posterUrl,
        genres: film.genres,
        runtime: film.runtime,
        language: film.language,
        country: film.country,
      }, await getToken());
      router.push(ROUTES.TITLE("movie", resolved.filmId));
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
    if (view !== "details") next.set("view", view);
    router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  }

  function setView(nextView: FilmCatalogView) {
    var next = new URLSearchParams(searchParams.toString());
    if (nextView === "details") next.delete("view");
    else next.set("view", nextView);
    router.replace(next.size > 0 ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
  }

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

  const menuClass = "h-11 px-0 text-[11px] font-semibold tracking-[0.06em] after:hidden";

  return (
    <div className="min-h-full w-full bg-bg">
      <DiscoverTabs active="films" />

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-10">
        <header className="grid gap-5 border-b border-border py-7 sm:grid-cols-[1fr_auto] sm:items-end lg:py-9">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-film-red">
              The 35mm catalog
            </p>
            <h1 className="mt-1 font-display-discover text-[42px] leading-none tracking-[-0.03em] text-fg sm:text-[56px]">
              Films
            </h1>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-fg-muted sm:text-[14px]">
              Search movies, TV shows, and web series across 35mm and TMDB.
            </p>
          </div>
        </header>

        <div className="border-b border-border">
          <form onSubmit={submitSearch} role="search" className="flex h-14 items-center gap-2 border-b border-border sm:max-w-[520px]">
            <Search className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
            <label htmlFor="film-catalog-search" className="sr-only">Search movies and series</label>
            <input
              id="film-catalog-search"
              value={searchDraft}
              onChange={function (event) { setSearchDraft(event.target.value); }}
              placeholder="Search movies and series"
              maxLength={100}
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-subtle"
            />
            {searchDraft !== filters.q ? (
              <button type="submit" className="shrink-0 rounded-full bg-fg px-3 py-1.5 text-[11px] font-semibold text-bg hover:opacity-85">
                Search
              </button>
            ) : null}
          </form>

          <div className="scrollbar-hide overflow-x-auto" aria-label="Film filters">
            <div className="flex min-w-max items-center gap-5 sm:gap-6">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Filter
              </span>
              <TextFilterMenu ariaLabel="Sort films" value={filters.sort} triggerClassName={menuClass}
                triggerLabel={`Sort: ${currentLabel(SORT_OPTIONS, filters.sort)}`} options={SORT_OPTIONS}
                onValueChange={function (value) { setFilter("sort", value); }} />
              <TextFilterMenu ariaLabel="Film mood" value={filters.mood} triggerClassName={menuClass}
                triggerLabel={`Mood: ${currentLabel(mapOptions(DISCOVER_MOOD_OPTIONS), filters.mood)}`}
                options={mapOptions(DISCOVER_MOOD_OPTIONS)} onValueChange={function (value) { setFilter("mood", value); }} />
              <TextFilterMenu ariaLabel="Film type" value={filters.type} triggerClassName={menuClass}
                triggerLabel={`Type: ${currentLabel(TYPE_OPTIONS, filters.type)}`} options={TYPE_OPTIONS}
                onValueChange={function (value) { setFilter("type", value); }} />
              <TextFilterMenu ariaLabel="Film genre" value={filters.genre || "all"} triggerClassName={menuClass}
                triggerLabel={`Genre: ${filters.genre || "Any"}`} options={[{ value: "all", label: "Any genre" }, ...GENRE_OPTIONS]}
                onValueChange={function (value) { setFilter("genre", value === "all" ? "" : value); }} />
              <TextFilterMenu ariaLabel="Release decade" value={filters.decade ? filters.decade + "s" : "any"} triggerClassName={menuClass}
                triggerLabel={`Decade: ${filters.decade ? filters.decade + "s" : "Any"}`} options={mapOptions(DISCOVER_DECADE_OPTIONS)}
                onValueChange={function (value) { setFilter("decade", value === "any" ? "" : value.slice(0, 4)); }} />
              <TextFilterMenu ariaLabel="Film language" value={filters.language || "any"} triggerClassName={menuClass}
                triggerLabel={`Language: ${currentLabel(mapOptions(DISCOVER_LANGUAGE_OPTIONS), filters.language || "any")}`}
                options={mapOptions(DISCOVER_LANGUAGE_OPTIONS)} onValueChange={function (value) { setFilter("language", value === "any" ? "" : value); }} />
              <TextFilterMenu ariaLabel="Film runtime" value={filters.duration} triggerClassName={menuClass}
                triggerLabel={`Runtime: ${currentLabel(mapOptions(DISCOVER_DURATION_OPTIONS), filters.duration)}`}
                options={mapOptions(DISCOVER_DURATION_OPTIONS)} onValueChange={function (value) { setFilter("duration", value); }} />
              {activeFilterCount > 0 ? (
                <button type="button" onClick={clearFilters} className="h-11 shrink-0 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-film-red hover:opacity-70">
                  Clear {activeFilterCount}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border">
          {!filmsQuery.isLoading && !tmdbQuery.isLoading && !(filmsQuery.isError && tmdbQuery.isError) ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-muted" aria-live="polite">
              {localFilms.length} 35mm · {tmdbFilms.length} of {tmdbTotalResults == null ? "—" : tmdbTotalResults.toLocaleString()} TMDB
            </p>
          ) : <span />}
          <div className="inline-flex items-center rounded-sm border border-border-strong bg-elevated p-0.5" role="group" aria-label="Film layout">
            <ViewToggleButton active={view === "list"} label="List" onClick={function () { setView("list"); }}>
              <List className="h-4 w-4" aria-hidden />
            </ViewToggleButton>
            <ViewToggleButton active={view === "grid"} label="Grid" onClick={function () { setView("grid"); }}>
              <Grid2X2 className="h-4 w-4" aria-hidden />
            </ViewToggleButton>
            <ViewToggleButton active={view === "details"} label="Grid with info" onClick={function () { setView("details"); }}>
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </ViewToggleButton>
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
          <FilmsSkeleton />
        ) : filmsQuery.isError && tmdbQuery.isError ? (
          <EmptyState size="lg" icon={<Search className="h-7 w-7" aria-hidden />} headline="Films didn’t load"
            subline="Check your connection, then try the catalog again."
            primaryCta={{ label: "Try again", onClick: function () {
              void filmsQuery.refetch();
              void tmdbQuery.refetch();
            } }} />
        ) : films.length === 0 ? (
          <EmptyState size="lg" icon={<SlidersHorizontal className="h-7 w-7" aria-hidden />} headline="No films match"
            subline="Try a broader search or remove one of your filters."
            primaryCta={{ label: "Clear filters", onClick: clearFilters }} />
        ) : (
          <>
            {view === "list" ? (
              <div className="py-2">
                {films.map(function (film) {
                  return <FilmCatalogListRow key={catalogItemKey(film)} film={film} isOpening={openingFilmId === film.id} onOpen={openFilm} />;
                })}
              </div>
            ) : (
              <div className={view === "grid"
                ? "grid grid-cols-3 gap-2 py-7 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
                : "grid grid-cols-2 gap-x-3 gap-y-8 py-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 xl:grid-cols-6"}>
                {films.map(function (film) {
                  return <FilmCatalogCard key={catalogItemKey(film)} film={film} isOpening={openingFilmId === film.id} onOpen={openFilm} showInfo={view === "details"} />;
                })}
              </div>
            )}
            <div className="flex min-h-20 items-center justify-center border-t border-border py-5">
              {hasMoreFilms ? (
                <button
                  type="button"
                  disabled={isFetchingMore}
                  onClick={function () {
                    if (filmsQuery.hasNextPage && !filmsQuery.isFetchingNextPage) void filmsQuery.fetchNextPage();
                    if (tmdbQuery.hasNextPage && !tmdbQuery.isFetchingNextPage) void tmdbQuery.fetchNextPage();
                  }}
                  className="min-w-40 rounded-full border border-border-strong bg-elevated px-5 py-2.5 text-[12px] font-semibold text-fg transition-colors hover:border-fg disabled:cursor-wait disabled:opacity-60"
                >
                  {isFetchingMore ? "Loading more titles…" : "Load more titles"}
                </button>
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
        ? "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-[2px] bg-fg px-2 text-bg"
        : "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-[2px] px-2 text-fg-muted transition-colors hover:bg-hover hover:text-fg"}
    >
      {children}
      <span className="hidden text-[10px] font-semibold sm:inline">{label}</span>
    </button>
  );
}
