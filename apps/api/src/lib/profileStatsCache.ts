import { getRedisClient } from "./redis.js";

const PROFILE_STATS_CACHE_TTL_SECONDS = 60;
const PROFILE_STATS_INDEX_TTL_SECONDS = 10 * 60;
const CACHE_NS = "profile-stats:v3";

export type ProfileStatsCachePayload = {
  username: string;
  selectedYear: number | null;
  availableYears: number[];
  filmsLoggedCount: number;
  hoursWatched: number;
  runtimeKnownCount: number;
  averageRating: number | null;
  ratedCount: number;
  uniqueFilmsCount: number;
  rewatchCount: number;
  thisYearCount: number;
  reviewsWrittenCount: number;
  reviewLikeCount: number;
  memberSince: string | null;
  favoriteFilms: unknown[];
  genres: unknown[];
  activity: unknown[];
  ratingDistribution: unknown[];
  decades: unknown[];
  directors: unknown[];
  artists: unknown[];
  musicDirectors: unknown[];
  countries: unknown[];
  languages: unknown[];
  mostWatchedFilms: unknown[];
  cachedAt: string;
};

function normalizePart(value: string | number | null | undefined): string {
  if (value == null) return "none";
  var raw = String(value).trim();
  if (raw.length === 0) return "none";
  return encodeURIComponent(raw);
}

function viewerPart(viewerId: string | null): string {
  return normalizePart(viewerId ?? "guest");
}

function authorIndexKey(authorUserId: string): string {
  return `${CACHE_NS}:idx:author:${normalizePart(authorUserId)}`;
}

export function profileStatsCacheKey(input: {
  username: string;
  viewerId: string | null;
  year: number | null;
}): string {
  return [
    CACHE_NS,
    `username:${normalizePart(input.username.toLowerCase())}`,
    `viewer:${viewerPart(input.viewerId)}`,
    `year:${normalizePart(input.year ?? "all")}`,
  ].join(":");
}

function isProfileStatsPayload(value: unknown): value is ProfileStatsCachePayload {
  if (!value || typeof value !== "object") return false;
  var payload = value as Partial<ProfileStatsCachePayload>;
  return (
    typeof payload.username === "string" &&
    (payload.selectedYear === null || typeof payload.selectedYear === "number") &&
    Array.isArray(payload.availableYears) &&
    typeof payload.filmsLoggedCount === "number" &&
    typeof payload.hoursWatched === "number" &&
    typeof payload.runtimeKnownCount === "number" &&
    (payload.averageRating === null || typeof payload.averageRating === "number") &&
    typeof payload.ratedCount === "number" &&
    typeof payload.uniqueFilmsCount === "number" &&
    typeof payload.rewatchCount === "number" &&
    typeof payload.thisYearCount === "number" &&
    typeof payload.reviewsWrittenCount === "number" &&
    typeof payload.reviewLikeCount === "number" &&
    (payload.memberSince === null || typeof payload.memberSince === "string") &&
    Array.isArray(payload.favoriteFilms) &&
    Array.isArray(payload.genres) &&
    Array.isArray(payload.activity) &&
    Array.isArray(payload.ratingDistribution) &&
    Array.isArray(payload.decades) &&
    Array.isArray(payload.directors) &&
    Array.isArray(payload.artists) &&
    Array.isArray(payload.musicDirectors) &&
    Array.isArray(payload.countries) &&
    Array.isArray(payload.languages) &&
    Array.isArray(payload.mostWatchedFilms) &&
    typeof payload.cachedAt === "string"
  );
}

export async function getProfileStatsCache(
  key: string
): Promise<ProfileStatsCachePayload | null> {
  var redis = getRedisClient();
  if (!redis) return null;

  try {
    var cached = await redis.get<ProfileStatsCachePayload>(key);
    return isProfileStatsPayload(cached) ? cached : null;
  } catch (error) {
    console.error("[profile-stats-cache] read-failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setProfileStatsCache(
  key: string,
  value: ProfileStatsCachePayload,
  input: { authorUserId: string }
): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;

  var indexKey = authorIndexKey(input.authorUserId);
  try {
    await redis.set(key, value);
    await redis.expire(key, PROFILE_STATS_CACHE_TTL_SECONDS);
    await redis.sadd(indexKey, key);
    await redis.expire(indexKey, PROFILE_STATS_INDEX_TTL_SECONDS);
  } catch (error) {
    console.error("[profile-stats-cache] write-failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function invalidateProfileStatsCaches(authorUserIds: string[]): Promise<number> {
  var redis = getRedisClient();
  if (!redis) return 0;

  var unique = Array.from(
    new Set(
      authorUserIds
        .map(function (value) {
          return value.trim();
        })
        .filter(Boolean)
    )
  );

  var deleted = 0;
  for (var authorUserId of unique) {
    var indexKey = authorIndexKey(authorUserId);
    try {
      var members = await redis.smembers<string>(indexKey);
      var keys = members.filter(function (value): value is string {
        return typeof value === "string" && value.trim().length > 0;
      });
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
      await redis.del(indexKey);
    } catch (error) {
      console.error("[profile-stats-cache] invalidate-failed", {
        indexKey,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return deleted;
}
