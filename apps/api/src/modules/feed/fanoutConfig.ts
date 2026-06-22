export const DEFAULT_FEED_HIGH_FOLLOWER_THRESHOLD = 10_000;
export const DEFAULT_FEED_HIGH_FOLLOWER_CACHE_TTL_SECONDS = 45;
export const DEFAULT_FEED_HIGH_FOLLOWER_CACHE_POST_LIMIT = 100;

export function parseFeedHighFollowerThreshold(value: string | undefined): number {
  if (value == null || value.trim().length === 0) {
    return DEFAULT_FEED_HIGH_FOLLOWER_THRESHOLD;
  }

  var parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FEED_HIGH_FOLLOWER_THRESHOLD;
  }

  return Math.max(1, Math.floor(parsed));
}

export function feedHighFollowerThreshold(): number {
  return parseFeedHighFollowerThreshold(process.env.FEED_HIGH_FOLLOWER_THRESHOLD);
}

export function parseFeedHighFollowerCacheTtlSeconds(value: string | undefined): number {
  if (value == null || value.trim().length === 0) {
    return DEFAULT_FEED_HIGH_FOLLOWER_CACHE_TTL_SECONDS;
  }

  var parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FEED_HIGH_FOLLOWER_CACHE_TTL_SECONDS;
  }

  return Math.max(5, Math.min(Math.floor(parsed), 5 * 60));
}

export function feedHighFollowerCacheTtlSeconds(): number {
  return parseFeedHighFollowerCacheTtlSeconds(process.env.FEED_HIGH_FOLLOWER_CACHE_TTL_SECONDS);
}

export function parseFeedHighFollowerCachePostLimit(value: string | undefined): number {
  if (value == null || value.trim().length === 0) {
    return DEFAULT_FEED_HIGH_FOLLOWER_CACHE_POST_LIMIT;
  }

  var parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FEED_HIGH_FOLLOWER_CACHE_POST_LIMIT;
  }

  return Math.max(20, Math.min(Math.floor(parsed), 500));
}

export function feedHighFollowerCachePostLimit(): number {
  return parseFeedHighFollowerCachePostLimit(process.env.FEED_HIGH_FOLLOWER_CACHE_POST_LIMIT);
}
