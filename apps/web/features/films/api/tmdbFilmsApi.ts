"use client";

import type { FilmCatalogMediaType } from "@35mm/types";
import type { FilmCatalogDisplayItem, FilmCatalogFilters } from "./filmsApi";
import { posterUrl, yearFromDate } from "@/features/discover/lib/tmdb-utils";
import type { TMDBMovie } from "@/lib/tmdb/types";

const MOVIE_GENRE_IDS: Record<string, number> = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

const TV_GENRE_IDS: Record<string, number> = {
  Action: 10759,
  Adventure: 10759,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 10765,
  Mystery: 9648,
  Romance: 10749,
  "Science Fiction": 10765,
  War: 10768,
};

const GENRE_NAMES = new Map<number, string>([
  ...Object.entries(MOVIE_GENRE_IDS).map(function ([name, id]) { return [id, name] as const; }),
  [10759, "Action & Adventure"],
  [10762, "Kids"],
  [10763, "News"],
  [10764, "Reality"],
  [10765, "Sci-Fi & Fantasy"],
  [10766, "Soap"],
  [10767, "Talk"],
  [10768, "War & Politics"],
]);

const MOOD_GENRES: Record<string, string[]> = {
  light: ["Comedy", "Romance", "Animation"],
  cry: ["Drama", "Family"],
  edge: ["Thriller", "Horror", "Crime"],
  think: ["Mystery", "Documentary", "Science Fiction"],
  late: ["Horror", "Thriller", "Mystery"],
  together: ["Romance", "Family", "Comedy"],
};

const WEB_SERIES_KEYWORD_ID = 281372;

type TmdbDiscoverResponse = {
  page?: number;
  total_pages?: number;
  total_results?: number;
  results?: TMDBMovie[];
};

export type TmdbFilmCatalogPage = {
  items: FilmCatalogDisplayItem[];
  nextPage: number | null;
  totalResults: number;
};

function yearNumber(film: TMDBMovie): number | null {
  var value = yearFromDate(film.release_date || film.first_air_date || "");
  var year = Number(value);
  return Number.isInteger(year) ? year : null;
}

function genreIdFor(name: string, mediaType: FilmCatalogMediaType): number | undefined {
  return (mediaType === "tv" ? TV_GENRE_IDS : MOVIE_GENRE_IDS)[name];
}

function withGenreFilter(
  params: URLSearchParams,
  filters: FilmCatalogFilters,
  mediaType: FilmCatalogMediaType
) {
  var required: string[] = [];
  var genreId = genreIdFor(filters.genre, mediaType);
  if (genreId) required.push(String(genreId));
  if (filters.type === "documentary") required.push("99");

  var moodIds = MOOD_GENRES[filters.mood]
    ?.flatMap(function (name) {
      var id = genreIdFor(name, mediaType);
      return id ? [id] : [];
    });
  if (moodIds?.length) {
    required.push(moodIds.join("|"));
  }
  if (required.length > 0) params.set("with_genres", required.join(","));
}

function buildTmdbUrl(
  filters: FilmCatalogFilters,
  page: number,
  mediaType: FilmCatalogMediaType
): string {
  var params = new URLSearchParams({
    page: String(page),
    include_adult: "false",
  });
  if (filters.q) {
    params.set("query", filters.q);
    return `/api/tmdb/search/${mediaType}?${params.toString()}`;
  }

  var sortBy = filters.sort === "title_asc"
    ? mediaType === "tv" ? "name.asc" : "original_title.asc"
    : filters.sort === "year_asc"
      ? mediaType === "tv" ? "first_air_date.asc" : "primary_release_date.asc"
      : filters.sort === "year_desc"
        ? mediaType === "tv" ? "first_air_date.desc" : "primary_release_date.desc"
        : filters.sort === "recently_added"
          ? mediaType === "tv" ? "first_air_date.desc" : "primary_release_date.desc"
        : "popularity.desc";
  params.set("sort_by", sortBy);
  if (filters.decade) {
    var releaseField = mediaType === "tv" ? "first_air_date" : "primary_release_date";
    params.set(`${releaseField}.gte`, `${filters.decade}-01-01`);
    params.set(`${releaseField}.lte`, `${Number(filters.decade) + 9}-12-31`);
  }
  if (filters.language) params.set("with_original_language", filters.language);
  if (filters.type === "short_film") params.set("with_runtime.lte", "40");
  if (filters.mood === "short") params.set("with_runtime.lte", "89");
  if (filters.duration === "under_90") params.set("with_runtime.lte", "89");
  if (filters.duration === "90_to_120") {
    params.set("with_runtime.gte", "90");
    params.set("with_runtime.lte", "120");
  }
  if (filters.duration === "over_120") params.set("with_runtime.gte", "121");
  if (filters.type === "mini_series") params.set("with_type", "2");
  if (filters.type === "web_series") params.set("with_keywords", String(WEB_SERIES_KEYWORD_ID));
  withGenreFilter(params, filters, mediaType);
  return `/api/tmdb/discover/${mediaType}?${params.toString()}`;
}

function runtimeMatches(runtime: number | undefined, filters: FilmCatalogFilters): boolean {
  var needsRuntime = filters.type === "short_film" || filters.mood === "short" || filters.duration !== "any";
  if (!needsRuntime) return true;
  if (typeof runtime !== "number") return false;
  if (filters.type === "short_film" && runtime > 40) return false;
  if (filters.mood === "short" && runtime >= 90) return false;
  if (filters.duration === "under_90" && runtime >= 90) return false;
  if (filters.duration === "90_to_120" && (runtime < 90 || runtime > 120)) return false;
  if (filters.duration === "over_120" && runtime <= 120) return false;
  return true;
}

function searchResultMatches(
  film: TMDBMovie,
  filters: FilmCatalogFilters,
  mediaType: FilmCatalogMediaType
): boolean {
  if (!filters.q) return true;
  var genreIds = film.genre_ids ?? [];
  var requiredGenreId = genreIdFor(filters.genre, mediaType);
  if (filters.genre && !requiredGenreId) return false;
  if (requiredGenreId && !genreIds.includes(requiredGenreId)) return false;
  if (filters.type === "documentary" && !genreIds.includes(99)) return false;
  var moodIds = MOOD_GENRES[filters.mood]
    ?.flatMap(function (name) {
      var id = genreIdFor(name, mediaType);
      return id ? [id] : [];
    });
  if (moodIds?.length && !moodIds.some(function (id) { return genreIds.includes(id); })) return false;
  if (filters.decade) {
    var year = yearNumber(film);
    var start = Number(filters.decade);
    if (year == null || year < start || year > start + 9) return false;
  }
  if (filters.language && film.original_language !== filters.language) return false;
  return runtimeMatches(film.runtime, filters);
}

function mediaTypesFor(filters: FilmCatalogFilters): FilmCatalogMediaType[] {
  var mediaTypes: FilmCatalogMediaType[];
  if (filters.type === "movie" || filters.type === "short_film") mediaTypes = ["movie"];
  else if (filters.type === "tv_show" || filters.type === "web_series" || filters.type === "mini_series") mediaTypes = ["tv"];
  else mediaTypes = ["movie", "tv"];

  return mediaTypes.filter(function (mediaType) {
    return !filters.genre || Boolean(genreIdFor(filters.genre, mediaType));
  });
}

function mapTmdbItem(
  film: TMDBMovie,
  filters: FilmCatalogFilters,
  mediaType: FilmCatalogMediaType
): FilmCatalogDisplayItem | null {
  if (!searchResultMatches(film, filters, mediaType)) return null;
  return {
    id: `tmdb:${mediaType}:${film.id}`,
    tmdbId: film.id,
    mediaType,
    title: film.title || film.name || "Untitled",
    originalTitle: film.original_title ?? film.original_name ?? null,
    year: yearNumber(film),
    runtime: null,
    posterUrl: posterUrl(film.poster_path),
    genres: (film.genre_ids ?? []).flatMap(function (id) {
      var name = GENRE_NAMES.get(id);
      return name ? [name] : [];
    }),
    director: null,
    language: film.original_language ?? null,
    country: null,
    isVerified: false,
    source: "tmdb",
  };
}

function mergeMediaResults(
  groups: FilmCatalogDisplayItem[][],
  sort: FilmCatalogFilters["sort"]
): FilmCatalogDisplayItem[] {
  var merged = groups.flat();
  if (sort === "title_asc") {
    return merged.sort(function (a, b) { return a.title.localeCompare(b.title); });
  }
  if (sort === "year_asc" || sort === "year_desc") {
    var direction = sort === "year_asc" ? 1 : -1;
    return merged.sort(function (a, b) {
      return ((a.year ?? (sort === "year_asc" ? 9999 : -1)) - (b.year ?? (sort === "year_asc" ? 9999 : -1))) * direction;
    });
  }
  var interleaved: FilmCatalogDisplayItem[] = [];
  var largest = Math.max(0, ...groups.map(function (items) { return items.length; }));
  for (var index = 0; index < largest; index += 1) {
    for (var group of groups) {
      if (group[index]) interleaved.push(group[index]);
    }
  }
  return interleaved;
}

export async function fetchTmdbFilmsCatalog(
  filters: FilmCatalogFilters,
  page = 1
): Promise<TmdbFilmCatalogPage> {
  var mediaTypes = mediaTypesFor(filters);
  var responses = await Promise.all(mediaTypes.map(async function (mediaType) {
    var response = await fetch(buildTmdbUrl(filters, page, mediaType), { cache: "no-store" });
    if (!response.ok) throw new Error("TMDB catalog unavailable");
    return { mediaType, payload: (await response.json()) as TmdbDiscoverResponse };
  }));
  var totalPages = Math.max(0, ...responses.map(function ({ payload }) {
    return Math.min(typeof payload.total_pages === "number" ? payload.total_pages : page, 500);
  }));
  var groups = responses.map(function ({ mediaType, payload }) {
    return (Array.isArray(payload.results) ? payload.results : []).flatMap(function (film) {
      var item = mapTmdbItem(film, filters, mediaType);
      return item ? [item] : [];
    });
  });

  return {
    items: mergeMediaResults(groups, filters.sort),
    nextPage: page < totalPages ? page + 1 : null,
    totalResults: responses.reduce(function (total, { payload }) {
      return total + (typeof payload.total_results === "number" ? payload.total_results : 0);
    }, 0),
  };
}
