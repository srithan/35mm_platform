"use client";

import { HeroCard } from "./HeroCard";
import { FilmShelf } from "./FilmShelf";
import { SearchResultsView } from "./SearchResultsView";
import { EmptyState } from "@/components/EmptyState";
import {
  usePopular,
  useNowPlaying,
  useSearchMulti,
  useTrending,
} from "../hooks/useDiscoverData";
import type { TMDBMovie } from "@/lib/tmdb/types";
import type { DiscoverMoodId } from "../lib/discoverMoodFilters";
import {
  discoverUsesTvMedia,
  type DiscoverExploreFiltersState,
} from "../lib/discoverExploreFilters";
import {
  DiscoverHeroSkeleton,
  DiscoverShelfSkeleton,
} from "./DiscoverSkeletons";

interface ExploreTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
  searchQuery: string;
  genreId: number | null;
  moodId: DiscoverMoodId;
  exploreFilters: DiscoverExploreFiltersState;
  activeFilterCount: number;
  onClearFilters: () => void;
}

function uniqueFilms(films: TMDBMovie[]) {
  const seen = new Set<number>();
  return films.filter(function (film) {
    if (seen.has(film.id)) return false;
    seen.add(film.id);
    return true;
  });
}

function filmsByGenre(films: TMDBMovie[], genreIds: number[]) {
  const matching = films.filter(function (film) {
    return film.genre_ids?.some(function (id) {
      return genreIds.includes(id);
    });
  });

  if (matching.length < 5) return [];
  return matching.slice(0, 12);
}

export function ExploreTabContent({
  onOpenDetail,
  searchQuery,
  genreId,
  moodId,
  exploreFilters,
  activeFilterCount,
  onClearFilters,
}: ExploreTabContentProps) {
  const { movies: popular, loading: popularLoading } = usePopular(
    genreId,
    moodId,
    exploreFilters
  );
  const { movies: nowPlaying, loading: nowPlayingLoading } = useNowPlaying(
    genreId,
    moodId,
    exploreFilters
  );
  const { movies: trending, loading: trendingLoading } = useTrending();
  const usesTv = discoverUsesTvMedia(exploreFilters.typeId);
  const recentShelfTitle = usesTv ? "Recently aired" : "Now playing";
  const { movies: searchResults, loading: searchLoading } = useSearchMulti(searchQuery);

  const editorPick = popular[0];
  const featuredRelease = nowPlaying[1];
  const excludeIds = [editorPick?.id, featuredRelease?.id].filter(
    function (id): id is number {
      return id != null;
    }
  );
  const popularFiltered = popular.filter(function (f) {
    return !excludeIds.includes(f.id);
  });
  const nowPlayingFiltered = nowPlaying.filter(function (f) {
    return !excludeIds.includes(f.id);
  });
  const blendedFilms = uniqueFilms([...popularFiltered, ...nowPlayingFiltered]);
  const sciFiDramaMystery = filmsByGenre(blendedFilms, [878, 18, 9648]);
  const adventureFantasyHistory = filmsByGenre(blendedFilms, [12, 14, 36, 10752]);
  const trendingFilms = trending.slice(0, 14);
  const popularFilms = popularFiltered.slice(0, 14);
  const newAndNear = uniqueFilms(nowPlayingFiltered).slice(0, 14);

  const isSearchActive = searchQuery.trim().length > 0;
  const hasAnyShelf =
    Boolean(editorPick) ||
    Boolean(featuredRelease) ||
    trendingFilms.length > 0 ||
    popularFilms.length > 0 ||
    newAndNear.length > 0 ||
    sciFiDramaMystery.length > 0 ||
    adventureFantasyHistory.length > 0;
  const showFilteredEmptyState = !isSearchActive && activeFilterCount > 0 && !hasAnyShelf;
  const showPopularSkeleton = popularLoading && popular.length === 0;
  const showNowPlayingSkeleton = nowPlayingLoading && nowPlaying.length === 0;
  const showTrendingSkeleton = trendingLoading && trending.length === 0;

  return (
    <div className="w-full pb-8 pt-5">
      {isSearchActive ? (
        <SearchResultsView
          query={searchQuery.trim()}
          movies={searchResults}
          loading={searchLoading}
          onFilmClick={onOpenDetail}
        />
      ) : showFilteredEmptyState ? (
        <EmptyState
          size="lg"
          icon={<span className="text-[24px]">🎞️</span>}
          headline="No films match your filters"
          subline="Try adjusting or clearing your filters"
          primaryCta={{ label: "Clear filters", onClick: onClearFilters }}
        />
      ) : (
        <>
          {editorPick ? (
            <div>
              <HeroCard
                film={editorPick}
                label="Popular pick"
                onOpenDetail={onOpenDetail}
              />
            </div>
          ) : showPopularSkeleton ? (
            <DiscoverHeroSkeleton />
          ) : null}

          {trendingFilms.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title="Trending this week"
                films={trendingFilms}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : showTrendingSkeleton ? (
            <div className="mt-8">
              <DiscoverShelfSkeleton
                titleWidth="w-40"
                cardCount={7}
              />
            </div>
          ) : null}

          {popularFilms.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title="Popular films"
                films={popularFilms}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : showPopularSkeleton ? (
            <div className="mt-8">
              <DiscoverShelfSkeleton
                titleWidth="w-32"
                cardCount={7}
              />
            </div>
          ) : null}

          {newAndNear.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title={recentShelfTitle}
                films={newAndNear}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : showNowPlayingSkeleton ? (
            <div className="mt-8">
              <DiscoverShelfSkeleton
                titleWidth="w-36"
                cardCount={7}
              />
            </div>
          ) : null}

          {featuredRelease ? (
            <div className="mt-8">
              <HeroCard
                film={featuredRelease}
                label={recentShelfTitle}
                onOpenDetail={onOpenDetail}
              />
            </div>
          ) : showNowPlayingSkeleton ? (
            <div className="mt-8">
              <DiscoverHeroSkeleton />
            </div>
          ) : null}

          {sciFiDramaMystery.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title="Sci-fi, drama & mystery"
                films={sciFiDramaMystery}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : showPopularSkeleton || showNowPlayingSkeleton ? (
            <div className="mt-8">
              <DiscoverShelfSkeleton
                titleWidth="w-44"
                cardCount={7}
              />
            </div>
          ) : null}

          {adventureFantasyHistory.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title="Adventure, fantasy & history"
                films={adventureFantasyHistory}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : showPopularSkeleton || showNowPlayingSkeleton ? (
            <div className="mt-8">
              <DiscoverShelfSkeleton
                titleWidth="w-48"
                cardCount={7}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
