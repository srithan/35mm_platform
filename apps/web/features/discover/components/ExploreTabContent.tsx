"use client";

import { HeroCard } from "./HeroCard";
import { FilmShelf } from "./FilmShelf";
import { SearchResultsView } from "./SearchResultsView";
import { usePopular, useNowPlaying, useSearchMulti } from "../hooks/useDiscoverData";
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

function filmsByGenre(
  films: TMDBMovie[],
  genreIds: number[],
  fallbackStart: number,
  fallbackEnd: number
) {
  const matching = films.filter(function (film) {
    return film.genre_ids?.some(function (id) {
      return genreIds.includes(id);
    });
  });

  if (matching.length >= 5) return matching.slice(0, 12);
  return films.slice(fallbackStart, fallbackEnd);
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
  const recentShelfTitle = discoverUsesTvMedia(exploreFilters.typeId)
    ? "Recently aired"
    : "Now playing";
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
  const quietSciFi = filmsByGenre(blendedFilms, [878, 18, 9648], 6, 18);
  const unrealCinematography = filmsByGenre(
    blendedFilms,
    [12, 14, 36, 10752],
    12,
    24
  );
  const conversationFilms = blendedFilms.slice(0, 14);
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
                label="Editor's Pick"
                onOpenDetail={onOpenDetail}
              />
            </div>
          ) : null}

          <div className="mt-8">
            <FilmShelf
              title="Films That Broke The Internet"
              subtitle="The titles people are opening, rating, and arguing about right now."
              films={conversationFilms}
              onFilmClick={onOpenDetail}
            />
          </div>

          <div className="mt-8">
            <FilmShelf
              title={recentShelfTitle}
              subtitle="Fresh releases and current runs worth catching before the moment passes."
              films={newAndNear}
              onFilmClick={onOpenDetail}
            />
          </div>

          {featuredRelease ? (
            <div className="mt-8">
              <HeroCard
                film={featuredRelease}
                label={recentShelfTitle}
                onOpenDetail={onOpenDetail}
              />
            </div>
          ) : null}

          <div className="mt-8">
            <FilmShelf
              title="Quiet Sci-Fi Gems"
              subtitle="Strange worlds, thoughtful tension, and late-night discoveries."
              films={quietSciFi}
              onFilmClick={onOpenDetail}
            />
          </div>

          <div className="mt-8">
            <FilmShelf
              title="Films With Unreal Cinematography"
              subtitle="Big images, sharp atmosphere, and frames that linger."
              films={unrealCinematography}
              onFilmClick={onOpenDetail}
            />
          </div>
        </>
      )}
    </div>
  );
}
