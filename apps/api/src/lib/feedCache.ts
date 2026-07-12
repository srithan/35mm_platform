import { getRedisClient } from "./redis.js";

const FEED_CACHE_TTL_SECONDS = 60;
const FEED_INDEX_TTL_SECONDS = 10 * 60;
const CACHE_NS = "feed-cache:v1";
const GUEST = "guest";

export type FeedCachePayload = {
  items: unknown[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type HighFollowerAuthorFeedCachePayload = {
  items: unknown[];
  cachedAt: string;
  rowLimit: number;
};

function normalizePart(value: string | number | null | undefined): string {
  if (value == null) return "none";
  var raw = String(value).trim();
  if (raw.length === 0) return "none";
  return encodeURIComponent(raw);
}

function viewerIdPart(viewerId: string | null): string {
  return normalizePart(viewerId ?? GUEST);
}

function viewerIndexKey(viewerId: string | null): string {
  return `${CACHE_NS}:idx:viewer:${viewerIdPart(viewerId)}`;
}

function authorIndexKey(authorUserId: string): string {
  return `${CACHE_NS}:idx:author:${normalizePart(authorUserId)}`;
}

function highFollowerAuthorFeedCacheKey(authorUserId: string): string {
  return `${CACHE_NS}:home:high-author:${normalizePart(authorUserId)}`;
}

export function homeFeedCacheKey(input: {
  viewerId: string | null;
  cursor: string | null;
  limit: number;
}): string {
  return [
    CACHE_NS,
    "home",
    `viewer:${viewerIdPart(input.viewerId)}`,
    `cursor:${normalizePart(input.cursor)}`,
    `limit:${normalizePart(input.limit)}`,
  ].join(":");
}

export function profileFeedCacheKey(input: {
  username: string;
  viewerId: string | null;
  cursor: string | null;
  limit: number;
}): string {
  return [
    CACHE_NS,
    "profile",
    `username:${normalizePart(input.username.toLowerCase())}`,
    `viewer:${viewerIdPart(input.viewerId)}`,
    `cursor:${normalizePart(input.cursor)}`,
    `limit:${normalizePart(input.limit)}`,
  ].join(":");
}

export async function getFeedCache(key: string): Promise<FeedCachePayload | null> {
  var redis = getRedisClient();
  if (!redis) return null;

  try {
    var cached = await redis.get<FeedCachePayload>(key);
    if (!cached || typeof cached !== "object") return null;
    if (!Array.isArray(cached.items)) return null;
    if (typeof cached.hasMore !== "boolean") return null;
    if (cached.nextCursor !== null && typeof cached.nextCursor !== "string") return null;
    return cached;
  } catch (error) {
    console.error("[feed-cache] read-failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setFeedCache(
  key: string,
  value: FeedCachePayload,
  input: { viewerId: string | null; authorUserId?: string | null }
) {
  var redis = getRedisClient();
  if (!redis) return;

  var viewerIndex = viewerIndexKey(input.viewerId);
  var authorIndex = input.authorUserId ? authorIndexKey(input.authorUserId) : null;

  try {
    await redis.set(key, value);
    await redis.expire(key, FEED_CACHE_TTL_SECONDS);
    await redis.sadd(viewerIndex, key);
    await redis.expire(viewerIndex, FEED_INDEX_TTL_SECONDS);

    if (authorIndex) {
      await redis.sadd(authorIndex, key);
      await redis.expire(authorIndex, FEED_INDEX_TTL_SECONDS);
    }
  } catch (error) {
    console.error("[feed-cache] write-failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getHighFollowerAuthorFeedCache(
  authorUserId: string
): Promise<HighFollowerAuthorFeedCachePayload | null> {
  var redis = getRedisClient();
  if (!redis) return null;

  var key = highFollowerAuthorFeedCacheKey(authorUserId);
  try {
    var cached = await redis.get<HighFollowerAuthorFeedCachePayload>(key);
    if (!cached || typeof cached !== "object") return null;
    if (!Array.isArray(cached.items)) return null;
    if (typeof cached.cachedAt !== "string") return null;
    if (typeof cached.rowLimit !== "number") return null;
    return cached;
  } catch (error) {
    console.error("[feed-cache] high-author-read-failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setHighFollowerAuthorFeedCache(
  authorUserId: string,
  value: HighFollowerAuthorFeedCachePayload,
  ttlSeconds: number
): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;

  var key = highFollowerAuthorFeedCacheKey(authorUserId);
  try {
    await redis.set(key, value);
    await redis.expire(key, ttlSeconds);
  } catch (error) {
    console.error("[feed-cache] high-author-write-failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function invalidateHighFollowerAuthorFeedCache(authorUserId: string): Promise<number> {
  var redis = getRedisClient();
  if (!redis) return 0;
  try {
    await redis.del(highFollowerAuthorFeedCacheKey(authorUserId));
    return 1;
  } catch (error) {
    console.error("[feed-cache] high-author-invalidate-failed", {
      authorUserId,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

async function deleteKeysFromIndex(indexKey: string): Promise<number> {
  var redis = getRedisClient();
  if (!redis) return 0;

  try {
    var members = await redis.smembers<string>(indexKey);
    if (!members || members.length === 0) {
      await redis.del(indexKey);
      return 0;
    }

    var keys = members.filter(function (value): value is string {
      return typeof value === "string" && value.trim().length > 0;
    });
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.del(indexKey);
    return keys.length;
  } catch (error) {
    console.error("[feed-cache] invalidate-index-failed", {
      indexKey,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export async function invalidateViewerFeedCaches(viewerIds: Array<string | null>): Promise<number> {
  var unique = Array.from(
    new Set(
      viewerIds.map(function (viewerId) {
        return viewerId ?? null;
      })
    )
  );
  var deleted = 0;
  for (var i = 0; i < unique.length; i += 1) {
    deleted += await deleteKeysFromIndex(viewerIndexKey(unique[i]));
  }
  return deleted;
}

export async function invalidateAuthorProfileFeedCaches(authorUserIds: string[]): Promise<number> {
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
  for (var i = 0; i < unique.length; i += 1) {
    deleted += await deleteKeysFromIndex(authorIndexKey(unique[i]));
  }
  return deleted;
}

export async function invalidateFeedCacheForGuest(): Promise<number> {
  return invalidateViewerFeedCaches([null]);
}
