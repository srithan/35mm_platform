import type { FeedPage, FilmListPage } from "@35mm/types";

import { parseFeedPage } from "@/features/videos/contracts";
import { parseFilmListPage } from "@/features/lists/contracts";

export type ProfileFollowState = "none" | "requested" | "following" | "self";

export interface PublicProfile {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly bio: string | null;
  readonly avatarUrl: string | null;
  readonly avatarUrlLg: string | null;
  readonly coverUrl: string | null;
  readonly location: string | null;
  readonly website: string | null;
  readonly dateOfBirth: string | null;
  readonly role: string | null;
  readonly roleContext: string | null;
  readonly headline: string | null;
  readonly headlineContext: string | null;
  readonly filmsLoggedCount: number;
  readonly followerCount: number;
  readonly followingCount: number;
  readonly followState: ProfileFollowState;
  readonly isPrivate: boolean;
  readonly hasIncomingFollowRequest: boolean;
  readonly hasPendingRequestToViewer: boolean;
  readonly isMutedByViewer: boolean;
  readonly isDeactivated: boolean;
  readonly moderationStatus: "visible" | "hidden" | "removed" | null;
  readonly createdAt: string | null;
}

export interface ProfileStatsFilm {
  readonly id: string;
  readonly tmdbId: number | null;
  readonly imdbId: string | null;
  readonly title: string;
  readonly year: number | null;
  readonly posterUrl: string | null;
}

export interface ProfileStatsSummary {
  readonly username: string;
  readonly selectedYear: number | null;
  readonly availableYears: readonly number[];
  readonly filmsLoggedCount: number;
  readonly hoursWatched: number;
  readonly runtimeKnownCount: number;
  readonly averageRating: number | null;
  readonly ratedCount: number;
  readonly uniqueFilmsCount: number;
  readonly rewatchCount: number;
  readonly thisYearCount: number;
  readonly reviewsWrittenCount: number;
  readonly reviewLikeCount: number;
  readonly memberSince: string | null;
  readonly favoriteFilms: readonly ProfileStatsFilm[];
  readonly genres: readonly { readonly name: string; readonly count: number; readonly percentage: number }[];
  readonly activity: readonly { readonly date: string; readonly count: number }[];
  readonly ratingDistribution: readonly { readonly rating: number; readonly count: number }[];
  readonly decades: readonly { readonly decade: number; readonly count: number }[];
  readonly directors: readonly { readonly name: string; readonly count: number }[];
  readonly artists: readonly { readonly name: string; readonly count: number }[];
  readonly musicDirectors: readonly { readonly name: string; readonly count: number }[];
  readonly countries: readonly { readonly name: string; readonly count: number }[];
  readonly languages: readonly { readonly name: string; readonly count: number }[];
  readonly mostWatchedFilms: readonly (ProfileStatsFilm & { readonly watches: number })[];
  readonly cachedAt: string;
}

export interface ProfileConnectionUser {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly avatarUrlLg: string | null;
  readonly bio: string | null;
  readonly followedAt: string;
  readonly followState: ProfileFollowState;
}

export interface ProfileConnectionsPage {
  readonly items: readonly ProfileConnectionUser[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
  readonly viewerOwnsProfile: boolean;
}

export interface ProfileMediaPresign {
  readonly uploadUrl: string;
  readonly publicUrl: string;
  readonly contentType: string;
  readonly expiresInSeconds: number;
}

export interface CurrentProfilePatch {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  readonly bio: string | null;
  readonly avatarUrl: string | null;
  readonly avatarUrlLg: string | null;
  readonly coverUrl: string | null;
  readonly location: string | null;
  readonly website: string | null;
  readonly dateOfBirth: string | null;
  readonly role: string | null;
  readonly roleContext: string | null;
  readonly headline: string | null;
  readonly headlineContext: string | null;
}

function record(value: unknown, contract: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string, contract: string): string {
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new Error(`${contract}.${key} must be a non-empty string.`);
  }
  return field;
}

function nullableStringField(value: Record<string, unknown>, key: string, contract: string): string | null {
  const field = value[key];
  if (field === undefined || field === null) return null;
  if (typeof field !== "string") {
    throw new Error(`${contract}.${key} must be a string or null.`);
  }
  return field;
}

function booleanField(value: Record<string, unknown>, key: string, contract: string, fallback = false): boolean {
  const field = value[key];
  if (field === undefined) return fallback;
  if (typeof field !== "boolean") {
    throw new Error(`${contract}.${key} must be a boolean.`);
  }
  return field;
}

function countField(value: Record<string, unknown>, key: string, contract: string): number {
  const field = value[key];
  if (typeof field !== "number" || !Number.isSafeInteger(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative integer.`);
  }
  return field;
}

function nullableCountField(value: Record<string, unknown>, key: string, contract: string): number | null {
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "number" || !Number.isSafeInteger(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative integer or null.`);
  }
  return field;
}

function finiteNumberField(value: Record<string, unknown>, key: string, contract: string): number {
  const field = value[key];
  if (typeof field !== "number" || !Number.isFinite(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative number.`);
  }
  return field;
}

function nullableFiniteNumberField(value: Record<string, unknown>, key: string, contract: string): number | null {
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "number" || !Number.isFinite(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative number or null.`);
  }
  return field;
}

function isoDateField(value: Record<string, unknown>, key: string, contract: string): string {
  const field = stringField(value, key, contract);
  if (!Number.isFinite(Date.parse(field))) {
    throw new Error(`${contract}.${key} must be an ISO date.`);
  }
  return field;
}

function optionalIsoDateField(value: Record<string, unknown>, key: string, contract: string): string | null {
  const field = nullableStringField(value, key, contract);
  if (field !== null && !Number.isFinite(Date.parse(field))) {
    throw new Error(`${contract}.${key} must be an ISO date or null.`);
  }
  return field;
}

function numberArray(value: unknown, contract: string): readonly number[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "number" || !Number.isSafeInteger(item))) {
    throw new Error(`${contract} must be an integer array.`);
  }
  return value;
}

function namedCounts(value: unknown, contract: string) {
  if (!Array.isArray(value)) throw new Error(`${contract} must be an array.`);
  return value.map((item, index) => {
    const source = record(item, `${contract}[${index}]`);
    return {
      name: stringField(source, "name", `${contract}[${index}]`),
      count: countField(source, "count", `${contract}[${index}]`),
    };
  });
}

function parseStatsFilm(value: unknown, contract: string): ProfileStatsFilm {
  const film = record(value, contract);
  return {
    id: stringField(film, "id", contract),
    tmdbId: nullableCountField(film, "tmdbId", contract),
    imdbId: nullableStringField(film, "imdbId", contract),
    title: stringField(film, "title", contract),
    year: nullableCountField(film, "year", contract),
    posterUrl: nullableStringField(film, "posterUrl", contract),
  };
}

export function parsePublicProfile(value: unknown): PublicProfile {
  const profile = record(value, "PublicProfile");
  const followState = profile.followState;
  const moderationStatus = profile.moderationStatus;
  if (!["none", "requested", "following", "self"].includes(String(followState))) {
    throw new Error("PublicProfile.followState is invalid.");
  }
  if (
    moderationStatus !== undefined &&
    moderationStatus !== null &&
    !["visible", "hidden", "removed"].includes(String(moderationStatus))
  ) {
    throw new Error("PublicProfile.moderationStatus is invalid.");
  }
  return {
    userId: stringField(profile, "userId", "PublicProfile"),
    username: stringField(profile, "username", "PublicProfile"),
    displayName: stringField(profile, "displayName", "PublicProfile"),
    bio: nullableStringField(profile, "bio", "PublicProfile"),
    avatarUrl: nullableStringField(profile, "avatarUrl", "PublicProfile"),
    avatarUrlLg: nullableStringField(profile, "avatarUrlLg", "PublicProfile"),
    coverUrl: nullableStringField(profile, "coverUrl", "PublicProfile"),
    location: nullableStringField(profile, "location", "PublicProfile"),
    website: nullableStringField(profile, "website", "PublicProfile"),
    dateOfBirth: nullableStringField(profile, "dateOfBirth", "PublicProfile"),
    role: nullableStringField(profile, "role", "PublicProfile"),
    roleContext: nullableStringField(profile, "roleContext", "PublicProfile"),
    headline: nullableStringField(profile, "headline", "PublicProfile"),
    headlineContext: nullableStringField(profile, "headlineContext", "PublicProfile"),
    filmsLoggedCount: countField(profile, "filmsLoggedCount", "PublicProfile"),
    followerCount: countField(profile, "followerCount", "PublicProfile"),
    followingCount: countField(profile, "followingCount", "PublicProfile"),
    followState: followState as ProfileFollowState,
    isPrivate: booleanField(profile, "isPrivate", "PublicProfile"),
    hasIncomingFollowRequest: booleanField(profile, "hasIncomingFollowRequest", "PublicProfile"),
    hasPendingRequestToViewer: booleanField(profile, "hasPendingRequestToViewer", "PublicProfile"),
    isMutedByViewer: booleanField(profile, "isMutedByViewer", "PublicProfile"),
    isDeactivated: booleanField(profile, "isDeactivated", "PublicProfile"),
    moderationStatus: (moderationStatus ?? null) as PublicProfile["moderationStatus"],
    createdAt: optionalIsoDateField(profile, "createdAt", "PublicProfile"),
  };
}

export function parseCurrentProfilePatch(value: unknown): CurrentProfilePatch {
  const profile = record(value, "CurrentProfilePatch");
  return {
    userId: stringField(profile, "userId", "CurrentProfilePatch"),
    username: stringField(profile, "username", "CurrentProfilePatch"),
    displayName: stringField(profile, "displayName", "CurrentProfilePatch"),
    bio: nullableStringField(profile, "bio", "CurrentProfilePatch"),
    avatarUrl: nullableStringField(profile, "avatarUrl", "CurrentProfilePatch"),
    avatarUrlLg: nullableStringField(profile, "avatarUrlLg", "CurrentProfilePatch"),
    coverUrl: nullableStringField(profile, "coverUrl", "CurrentProfilePatch"),
    location: nullableStringField(profile, "location", "CurrentProfilePatch"),
    website: nullableStringField(profile, "website", "CurrentProfilePatch"),
    dateOfBirth: nullableStringField(profile, "dateOfBirth", "CurrentProfilePatch"),
    role: nullableStringField(profile, "role", "CurrentProfilePatch"),
    roleContext: nullableStringField(profile, "roleContext", "CurrentProfilePatch"),
    headline: nullableStringField(profile, "headline", "CurrentProfilePatch"),
    headlineContext: nullableStringField(profile, "headlineContext", "CurrentProfilePatch"),
  };
}

export function parseProfileFeedPage(value: unknown): FeedPage {
  return parseFeedPage(value);
}

export function parseProfileListPage(value: unknown): FilmListPage {
  return parseFilmListPage(value);
}

export function parseProfileStats(value: unknown): ProfileStatsSummary {
  const stats = record(value, "ProfileStatsSummary");
  const genresRaw = stats.genres;
  const activityRaw = stats.activity;
  const ratingsRaw = stats.ratingDistribution;
  const decadesRaw = stats.decades;
  const mostWatchedRaw = stats.mostWatchedFilms;
  if (!Array.isArray(genresRaw) || !Array.isArray(activityRaw) || !Array.isArray(ratingsRaw) ||
      !Array.isArray(decadesRaw) || !Array.isArray(mostWatchedRaw) || !Array.isArray(stats.favoriteFilms)) {
    throw new Error("ProfileStatsSummary arrays are invalid.");
  }

  return {
    username: stringField(stats, "username", "ProfileStatsSummary"),
    selectedYear: stats.selectedYear === null ? null : countField(stats, "selectedYear", "ProfileStatsSummary"),
    availableYears: numberArray(stats.availableYears, "ProfileStatsSummary.availableYears"),
    filmsLoggedCount: countField(stats, "filmsLoggedCount", "ProfileStatsSummary"),
    hoursWatched: finiteNumberField(stats, "hoursWatched", "ProfileStatsSummary"),
    runtimeKnownCount: countField(stats, "runtimeKnownCount", "ProfileStatsSummary"),
    averageRating: nullableFiniteNumberField(stats, "averageRating", "ProfileStatsSummary"),
    ratedCount: countField(stats, "ratedCount", "ProfileStatsSummary"),
    uniqueFilmsCount: countField(stats, "uniqueFilmsCount", "ProfileStatsSummary"),
    rewatchCount: countField(stats, "rewatchCount", "ProfileStatsSummary"),
    thisYearCount: countField(stats, "thisYearCount", "ProfileStatsSummary"),
    reviewsWrittenCount: countField(stats, "reviewsWrittenCount", "ProfileStatsSummary"),
    reviewLikeCount: countField(stats, "reviewLikeCount", "ProfileStatsSummary"),
    memberSince: optionalIsoDateField(stats, "memberSince", "ProfileStatsSummary"),
    favoriteFilms: stats.favoriteFilms.map((item, index) => parseStatsFilm(item, `ProfileStatsSummary.favoriteFilms[${index}]`)),
    genres: genresRaw.map((item, index) => {
      const genre = record(item, `ProfileStatsSummary.genres[${index}]`);
      return {
        name: stringField(genre, "name", `ProfileStatsSummary.genres[${index}]`),
        count: countField(genre, "count", `ProfileStatsSummary.genres[${index}]`),
        percentage: finiteNumberField(genre, "percentage", `ProfileStatsSummary.genres[${index}]`),
      };
    }),
    activity: activityRaw.map((item, index) => {
      const day = record(item, `ProfileStatsSummary.activity[${index}]`);
      return {
        date: stringField(day, "date", `ProfileStatsSummary.activity[${index}]`),
        count: countField(day, "count", `ProfileStatsSummary.activity[${index}]`),
      };
    }),
    ratingDistribution: ratingsRaw.map((item, index) => {
      const bucket = record(item, `ProfileStatsSummary.ratingDistribution[${index}]`);
      return {
        rating: finiteNumberField(bucket, "rating", `ProfileStatsSummary.ratingDistribution[${index}]`),
        count: countField(bucket, "count", `ProfileStatsSummary.ratingDistribution[${index}]`),
      };
    }),
    decades: decadesRaw.map((item, index) => {
      const decade = record(item, `ProfileStatsSummary.decades[${index}]`);
      return {
        decade: countField(decade, "decade", `ProfileStatsSummary.decades[${index}]`),
        count: countField(decade, "count", `ProfileStatsSummary.decades[${index}]`),
      };
    }),
    directors: namedCounts(stats.directors, "ProfileStatsSummary.directors"),
    artists: namedCounts(stats.artists, "ProfileStatsSummary.artists"),
    musicDirectors: namedCounts(stats.musicDirectors, "ProfileStatsSummary.musicDirectors"),
    countries: namedCounts(stats.countries, "ProfileStatsSummary.countries"),
    languages: namedCounts(stats.languages, "ProfileStatsSummary.languages"),
    mostWatchedFilms: mostWatchedRaw.map((item, index) => {
      const film = record(item, `ProfileStatsSummary.mostWatchedFilms[${index}]`);
      return {
        ...parseStatsFilm(item, `ProfileStatsSummary.mostWatchedFilms[${index}]`),
        watches: countField(film, "watches", `ProfileStatsSummary.mostWatchedFilms[${index}]`),
      };
    }),
    cachedAt: isoDateField(stats, "cachedAt", "ProfileStatsSummary"),
  };
}

export function parseProfileConnectionsPage(value: unknown): ProfileConnectionsPage {
  const page = record(value, "ProfileConnectionsPage");
  if (!Array.isArray(page.items)) {
    throw new Error("ProfileConnectionsPage.items must be an array.");
  }
  return {
    items: page.items.map((item, index) => {
      const user = record(item, `ProfileConnectionsPage.items[${index}]`);
      const followState = user.followState;
      if (!["none", "requested", "following", "self"].includes(String(followState))) {
        throw new Error(`ProfileConnectionsPage.items[${index}].followState is invalid.`);
      }
      return {
        userId: stringField(user, "userId", `ProfileConnectionsPage.items[${index}]`),
        username: stringField(user, "username", `ProfileConnectionsPage.items[${index}]`),
        displayName: stringField(user, "displayName", `ProfileConnectionsPage.items[${index}]`),
        avatarUrl: nullableStringField(user, "avatarUrl", `ProfileConnectionsPage.items[${index}]`),
        avatarUrlLg: nullableStringField(user, "avatarUrlLg", `ProfileConnectionsPage.items[${index}]`),
        bio: nullableStringField(user, "bio", `ProfileConnectionsPage.items[${index}]`),
        followedAt: isoDateField(user, "followedAt", `ProfileConnectionsPage.items[${index}]`),
        followState: followState as ProfileFollowState,
      };
    }),
    nextCursor: nullableStringField(page, "nextCursor", "ProfileConnectionsPage"),
    hasMore: booleanField(page, "hasMore", "ProfileConnectionsPage"),
    viewerOwnsProfile: booleanField(page, "viewerOwnsProfile", "ProfileConnectionsPage"),
  };
}

export function parseProfileMediaPresign(value: unknown): ProfileMediaPresign {
  const presign = record(value, "ProfileMediaPresign");
  const uploadUrl = stringField(presign, "uploadUrl", "ProfileMediaPresign");
  const publicUrl = stringField(presign, "publicUrl", "ProfileMediaPresign");
  for (const [field, candidate] of [["uploadUrl", uploadUrl], ["publicUrl", publicUrl]] as const) {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error(`ProfileMediaPresign.${field} must be HTTP(S).`);
    }
  }
  return {
    uploadUrl,
    publicUrl,
    contentType: stringField(presign, "contentType", "ProfileMediaPresign"),
    expiresInSeconds: countField(presign, "expiresInSeconds", "ProfileMediaPresign"),
  };
}
