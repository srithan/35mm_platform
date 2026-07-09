import { getRedisClient } from "../../lib/redis.js";

const CATALOG_READ_CACHE_TTL_SECONDS = 45;
const CATALOG_READ_CACHE_INDEX_TTL_SECONDS = 10 * 60;
const CACHE_NS = "catalog-read:v1";
const INDEX_KEY = `${CACHE_NS}:idx:public`;

export type CatalogReadCachePayload = unknown;

function normalizePart(value: string | number | null | undefined): string {
  if (value == null) return "none";
  var raw = String(value).trim();
  if (raw.length === 0) return "none";
  return encodeURIComponent(raw);
}

export function catalogReadCacheKey(rawUrl: string): string {
  var url = new URL(rawUrl, "http://localhost");
  var params = Array.from(url.searchParams.entries())
    .sort(function (a, b) {
      var keyCompare = a[0].localeCompare(b[0]);
      return keyCompare !== 0 ? keyCompare : a[1].localeCompare(b[1]);
    })
    .map(function ([key, value]) {
      return `${normalizePart(key)}=${normalizePart(value)}`;
    })
    .join("&");
  return [CACHE_NS, normalizePart(url.pathname), normalizePart(params)].join(":");
}

export async function getCatalogReadCache(key: string): Promise<CatalogReadCachePayload | null> {
  var redis = getRedisClient();
  if (!redis) return null;

  try {
    var cached = await redis.get<CatalogReadCachePayload>(key);
    return cached == null ? null : cached;
  } catch (error) {
    console.error("[catalog-read-cache] read-failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setCatalogReadCache(key: string, value: CatalogReadCachePayload): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, value);
    await redis.expire(key, CATALOG_READ_CACHE_TTL_SECONDS);
    await redis.sadd(INDEX_KEY, key);
    await redis.expire(INDEX_KEY, CATALOG_READ_CACHE_INDEX_TTL_SECONDS);
  } catch (error) {
    console.error("[catalog-read-cache] write-failed", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function invalidateCatalogReadCaches(): Promise<number> {
  var redis = getRedisClient();
  if (!redis) return 0;

  try {
    var members = await redis.smembers<string>(INDEX_KEY);
    var keys = members.filter(function (value): value is string {
      return typeof value === "string" && value.trim().length > 0;
    });
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.del(INDEX_KEY);
    return keys.length;
  } catch (error) {
    console.error("[catalog-read-cache] invalidate-failed", {
      indexKey: INDEX_KEY,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}
