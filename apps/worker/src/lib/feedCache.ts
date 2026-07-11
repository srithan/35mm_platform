import { resolveCacheRedisRestConfig } from "./redisConfig.js";

const CACHE_NS = "feed-cache:v1";
const FEED_INDEX_TTL_SECONDS = 10 * 60;

type RedisClient = {
  sadd(key: string, ...members: string[]): Promise<void>;
  smembers<T = string>(key: string): Promise<T[]>;
  expire(key: string, seconds: number): Promise<void>;
  del(...keys: string[]): Promise<void>;
};

var redisClient: RedisClient | null | undefined;

function normalizePart(value: string | number | null | undefined): string {
  if (value == null) return "none";
  var raw = String(value).trim();
  if (raw.length === 0) return "none";
  return encodeURIComponent(raw);
}

function viewerIndexKey(viewerId: string | null): string {
  return `${CACHE_NS}:idx:viewer:${normalizePart(viewerId ?? "guest")}`;
}

function configured(): boolean {
  return resolveCacheRedisRestConfig() !== null;
}

function buildClient(): RedisClient {
  var config = resolveCacheRedisRestConfig();
  if (!config) throw new Error("Redis cache config unavailable");
  var baseUrl = config.baseUrl;
  var token = config.token;

  async function command<T>(...parts: Array<string | number>): Promise<T | null> {
    var path = parts
      .map(function (part) {
        return encodeURIComponent(String(part));
      })
      .join("/");
    var response = await fetch(baseUrl + "/" + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) {
      throw new Error("Redis HTTP " + response.status);
    }

    var payload = (await response.json()) as { result?: T; error?: string };
    if (payload.error) {
      throw new Error(payload.error);
    }
    return (payload.result ?? null) as T | null;
  }

  return {
    async sadd(key: string, ...members: string[]) {
      if (members.length === 0) return;
      await command("sadd", key, ...members);
    },
    async smembers<T = string>(key: string) {
      var values = await command<T[]>("smembers", key);
      return Array.isArray(values) ? values : [];
    },
    async expire(key: string, seconds: number) {
      await command("expire", key, seconds);
    },
    async del(...keys: string[]) {
      if (keys.length === 0) return;
      await command("del", ...keys);
    },
  };
}

function getRedisClient(): RedisClient | null {
  if (redisClient !== undefined) return redisClient;
  redisClient = configured() ? buildClient() : null;
  return redisClient;
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
    console.error("[feed-cache] worker invalidate-index-failed", {
      indexKey,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export async function invalidateViewerFeedCaches(viewerIds: string[]): Promise<number> {
  var unique = Array.from(new Set(viewerIds));
  var deleted = 0;
  for (var i = 0; i < unique.length; i += 1) {
    deleted += await deleteKeysFromIndex(viewerIndexKey(unique[i]));
  }
  return deleted;
}

export async function markViewerFeedCacheIndex(viewerId: string, cacheKey: string): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;
  var indexKey = viewerIndexKey(viewerId);
  await redis.sadd(indexKey, cacheKey);
  await redis.expire(indexKey, FEED_INDEX_TTL_SECONDS);
}
