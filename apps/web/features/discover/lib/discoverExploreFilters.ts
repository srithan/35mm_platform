/**
 * Extended Explore sidebar filters → TMDB discover (movie or TV).
 */

import type { DiscoverMoodId } from "./discoverMoodFilters";
import {
  buildDiscoverWithGenres,
  getMoodDiscoverParams,
} from "./discoverMoodFilters";

export type DiscoverContentTypeId =
  | "film"
  | "series"
  | "short_film"
  | "documentary"
  | "mini_series";

/**
 * TMDB `with_original_language` uses ISO 639-1 (2-letter) codes.
 * IDs below must match TMDB (e.g. te=Telugu, ta=Tamil, ml=Malayalam).
 */
export const DISCOVER_LANGUAGE_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "en", label: "English" },
  { id: "ar", label: "Arabic" },
  { id: "bn", label: "Bengali" },
  { id: "zh", label: "Chinese" },
  { id: "cs", label: "Czech" },
  { id: "da", label: "Danish" },
  { id: "nl", label: "Dutch" },
  { id: "fa", label: "Persian" },
  { id: "fi", label: "Finnish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "el", label: "Greek" },
  { id: "gu", label: "Gujarati" },
  { id: "he", label: "Hebrew" },
  { id: "hi", label: "Hindi" },
  { id: "hu", label: "Hungarian" },
  { id: "id", label: "Indonesian" },
  { id: "it", label: "Italian" },
  { id: "ja", label: "Japanese" },
  { id: "kn", label: "Kannada" },
  { id: "ko", label: "Korean" },
  { id: "ml", label: "Malayalam" },
  { id: "mr", label: "Marathi" },
  { id: "no", label: "Norwegian" },
  { id: "pl", label: "Polish" },
  { id: "pt", label: "Portuguese" },
  { id: "pa", label: "Punjabi" },
  { id: "ro", label: "Romanian" },
  { id: "ru", label: "Russian" },
  { id: "sr", label: "Serbian" },
  { id: "es", label: "Spanish" },
  { id: "sv", label: "Swedish" },
  { id: "tl", label: "Tagalog" },
  { id: "ta", label: "Tamil" },
  { id: "te", label: "Telugu" },
  { id: "th", label: "Thai" },
  { id: "tr", label: "Turkish" },
  { id: "uk", label: "Ukrainian" },
  { id: "ur", label: "Urdu" },
  { id: "vi", label: "Vietnamese" },
] as const;

export type DiscoverLanguageId =
  (typeof DISCOVER_LANGUAGE_OPTIONS)[number]["id"];

export type DiscoverDurationId =
  | "any"
  | "under_90"
  | "90_to_120"
  | "over_120";

export type DiscoverDecadeId =
  | "any"
  | "2020s"
  | "2010s"
  | "2000s"
  /** 1990s and earlier (single bucket for compact UI). */
  | "pre_2000";

/** US theatrical (approximate; NR / unrated is loosely supported by TMDB). */
export type DiscoverCertificationId =
  | "any"
  | "G"
  | "PG"
  | "PG-13"
  | "R"
  | "NR";

export type DiscoverRatingPresetId =
  | "any"
  | "stars_4"
  | "stars_3_5"
  | "stars_3"
  | "elite";

export interface DiscoverExploreFiltersState {
  languageId: DiscoverLanguageId;
  durationId: DiscoverDurationId;
  decadeId: DiscoverDecadeId;
  certificationId: DiscoverCertificationId;
  typeId: DiscoverContentTypeId;
  ratingPresetId: DiscoverRatingPresetId;
}

export const DEFAULT_DISCOVER_EXPLORE_FILTERS: DiscoverExploreFiltersState =
  {
    languageId: "any",
    durationId: "any",
    decadeId: "any",
    certificationId: "any",
    typeId: "film",
    ratingPresetId: "any",
  };

export const DISCOVER_DURATION_OPTIONS: {
  id: DiscoverDurationId;
  label: string;
}[] = [
  { id: "any", label: "Any" },
  { id: "under_90", label: "Under 90 min" },
  { id: "90_to_120", label: "90–120 min" },
  { id: "over_120", label: "Over 120 min" },
];

export const DISCOVER_DECADE_OPTIONS: { id: DiscoverDecadeId; label: string }[] =
  [
    { id: "any", label: "Any" },
    { id: "2020s", label: "2020s" },
    { id: "2010s", label: "2010s" },
    { id: "2000s", label: "2000s" },
    { id: "pre_2000", label: "90s & older" },
  ];

export const DISCOVER_CERT_OPTIONS: {
  id: DiscoverCertificationId;
  label: string;
}[] = [
  { id: "any", label: "Any" },
  { id: "G", label: "G" },
  { id: "PG", label: "PG" },
  { id: "PG-13", label: "PG-13" },
  { id: "R", label: "R" },
  { id: "NR", label: "NR" },
];

export const DISCOVER_TYPE_OPTIONS: {
  id: DiscoverContentTypeId;
  label: string;
}[] = [
  { id: "film", label: "Film" },
  { id: "series", label: "Series" },
  { id: "short_film", label: "Short film" },
  { id: "documentary", label: "Documentary" },
  { id: "mini_series", label: "Mini-series" },
];

export const DISCOVER_RATING_OPTIONS: {
  id: DiscoverRatingPresetId;
  label: string;
}[] = [
  { id: "any", label: "Any" },
  { id: "stars_3", label: "6+ / solid" },
  { id: "stars_3_5", label: "7+ / great" },
  { id: "stars_4", label: "8+ / excellent" },
  { id: "elite", label: "Top 250 (strict)" },
];

export function discoverRecentSortBy(
  filters: DiscoverExploreFiltersState
): string {
  return discoverUsesTvMedia(filters.typeId)
    ? "first_air_date.desc"
    : "primary_release_date.desc";
}

export function isExploreFiltersDefault(
  f: DiscoverExploreFiltersState
): boolean {
  return (
    f.languageId === "any" &&
    f.durationId === "any" &&
    f.decadeId === "any" &&
    f.certificationId === "any" &&
    f.typeId === "film" &&
    f.ratingPresetId === "any"
  );
}

export function discoverUsesTvMedia(typeId: DiscoverContentTypeId): boolean {
  return typeId === "series" || typeId === "mini_series";
}

function decadeToReleaseRange(
  decadeId: DiscoverDecadeId
): { gte: string; lte: string } | null {
  if (decadeId === "any") return null;
  if (decadeId === "2020s") {
    return { gte: "2020-01-01", lte: "2029-12-31" };
  }
  if (decadeId === "2010s") {
    return { gte: "2010-01-01", lte: "2019-12-31" };
  }
  if (decadeId === "2000s") {
    return { gte: "2000-01-01", lte: "2009-12-31" };
  }
  if (decadeId === "pre_2000") {
    return { gte: "1900-01-01", lte: "1999-12-31" };
  }
  return null;
}

function applyRatingPreset(
  params: URLSearchParams,
  ratingId: DiscoverRatingPresetId
): void {
  if (ratingId === "any") return;
  if (ratingId === "stars_3") {
    params.set("vote_average.gte", "6");
    params.set("vote_count.gte", "80");
  } else if (ratingId === "stars_3_5") {
    params.set("vote_average.gte", "7");
    params.set("vote_count.gte", "120");
  } else if (ratingId === "stars_4") {
    params.set("vote_average.gte", "8");
    params.set("vote_count.gte", "200");
  } else if (ratingId === "elite") {
    params.set("vote_average.gte", "8");
    params.set("vote_count.gte", "1500");
  }
}

/**
 * Runtime (minutes): duration strip and mood/type merged.
 */
function mergeRuntimeFilters(
  typeId: DiscoverContentTypeId,
  durationId: DiscoverDurationId,
  moodId: DiscoverMoodId
): { gte: number | null; lte: number | null } {
  let gte: number | null = null;
  let lte: number | null = null;

  if (durationId !== "any") {
    if (durationId === "under_90") {
      lte = 90;
    } else if (durationId === "90_to_120") {
      gte = 90;
      lte = 120;
    } else if (durationId === "over_120") {
      gte = 120;
    }
  } else {
    const moodParams = getMoodDiscoverParams(moodId);
    if (moodParams && moodParams.with_runtime_lte != null) {
      lte = moodParams.with_runtime_lte;
    }
  }

  if (typeId === "short_film") {
    if (gte != null && gte >= 90) {
      return { gte: gte, lte: lte };
    }
    if (lte != null) {
      lte = Math.min(lte, 50);
    } else {
      lte = 50;
    }
  }

  return { gte: gte, lte: lte };
}

/**
 * with_genres for discover: mood + user genre, or documentary lock, or TV simple genre.
 */
function resolveWithGenres(
  moodId: DiscoverMoodId,
  genreId: number | null,
  typeId: DiscoverContentTypeId
): string | null {
  if (typeId === "documentary") {
    if (!genreId) return "99";
    return "99," + String(genreId);
  }
  if (typeId === "series" || typeId === "mini_series") {
    if (!genreId) return null;
    return String(genreId);
  }
  return buildDiscoverWithGenres(moodId, genreId);
}

export interface BuildDiscoverExploreUrlArgs {
  sortBy: string;
  genreId: number | null;
  moodId: DiscoverMoodId;
  filters: DiscoverExploreFiltersState;
}

/** Use curated /movie/popular and /movie/now_playing only when no filters apply. */
export function shouldUseDiscoverList(
  genreId: number | null,
  moodId: DiscoverMoodId,
  filters: DiscoverExploreFiltersState
): boolean {
  if (!isExploreFiltersDefault(filters)) return true;
  if (genreId != null) return true;
  if (moodId !== "all") return true;
  return false;
}

export function buildDiscoverExploreUrl(args: BuildDiscoverExploreUrlArgs): string {
  const { sortBy, genreId, moodId, filters } = args;
  const media = discoverUsesTvMedia(filters.typeId) ? "tv" : "movie";

  const params = new URLSearchParams();
  params.set("sort_by", sortBy);
  params.set("page", "1");

  const wg = resolveWithGenres(moodId, genreId, filters.typeId);
  if (wg) {
    params.set("with_genres", wg);
  }

  const mergedRt = mergeRuntimeFilters(
    filters.typeId,
    filters.durationId,
    moodId
  );
  if (mergedRt.gte != null) {
    params.set("with_runtime.gte", String(mergedRt.gte));
  }
  if (mergedRt.lte != null) {
    params.set("with_runtime.lte", String(mergedRt.lte));
  }

  if (filters.languageId !== "any") {
    params.set("with_original_language", filters.languageId);
  }

  const range = decadeToReleaseRange(filters.decadeId);
  if (range) {
    if (media === "tv") {
      params.set("first_air_date.gte", range.gte);
      params.set("first_air_date.lte", range.lte);
    } else {
      params.set("primary_release_date.gte", range.gte);
      params.set("primary_release_date.lte", range.lte);
    }
  }

  if (filters.certificationId !== "any") {
    params.set("certification_country", "US");
    params.set("certification", filters.certificationId);
  }

  applyRatingPreset(params, filters.ratingPresetId);

  const path =
    media === "tv" ? "/api/tmdb/discover/tv?" : "/api/tmdb/discover/movie?";
  return path + params.toString();
}
