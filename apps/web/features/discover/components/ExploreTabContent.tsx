"use client";

import { HeroCard } from "./HeroCard";
import { FilmShelf } from "./FilmShelf";
import { SearchResultsView } from "./SearchResultsView";
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

interface ExploreTabContentProps {
  onOpenDetail: (film: TMDBMovie) => void;
  searchQuery: string;
  genreId: number | null;
  moodId: DiscoverMoodId;
  exploreFilters: DiscoverExploreFiltersState;
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
}: ExploreTabContentProps) {
  const { movies: popular } = usePopular(genreId, moodId, exploreFilters);
  const { movies: nowPlaying } = useNowPlaying(genreId, moodId, exploreFilters);
  const { movies: trending } = useTrending();
  const usesTv = discoverUsesTvMedia(exploreFilters.typeId);
  const recentShelfTitle = usesTv ? "Recently aired" : "Now playing";
  const recentShelfSubtitle = usesTv
    ? "Series and episodes currently on the air."
    : "Films in theaters now, from TMDB's now playing list.";
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

  return (
    <div className="w-full pb-8 pt-5">
      {isSearchActive ? (
        <SearchResultsView
          query={searchQuery.trim()}
          movies={searchResults}
          loading={searchLoading}
          onFilmClick={onOpenDetail}
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
          ) : null}

          {trendingFilms.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title="Trending this week"
                subtitle="What’s rising across movies and TV on TMDB this week."
                films={trendingFilms}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : null}

          {popularFilms.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title="Popular films"
                subtitle="Top titles from TMDB’s popular list."
                films={popularFilms}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : null}

          {newAndNear.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title={recentShelfTitle}
                subtitle={recentShelfSubtitle}
                films={newAndNear}
                onFilmClick={onOpenDetail}
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
          ) : null}

          {sciFiDramaMystery.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title="Sci-fi, drama & mystery"
                subtitle="Titles tagged with science fiction, drama, or mystery in your current browse."
                films={sciFiDramaMystery}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : null}

          {adventureFantasyHistory.length > 0 ? (
            <div className="mt-8">
              <FilmShelf
                title="Adventure, fantasy & history"
                subtitle="Epic adventures, fantasy, historical dramas, and war stories from your browse."
                films={adventureFantasyHistory}
                onFilmClick={onOpenDetail}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
