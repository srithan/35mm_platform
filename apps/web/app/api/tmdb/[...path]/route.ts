import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const CACHE_NAMESPACE = "tmdb-proxy:v1";
const RATE_LIMIT_NAMESPACE = "rate-limit:v1:tmdb-proxy";
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_REQUESTS = 120;

type UpstashResult<T = unknown> = {
  result?: T;
  error?: string;
};

type CachedTmdbResponse = {
  status: number;
  data: unknown;
  cachedAt: string;
};

function redisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

async function redisCommand<T>(...parts: Array<string | number>): Promise<T | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "") ?? "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
  if (!baseUrl || !token) return null;

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parts),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis HTTP ${response.status}`);
  }

  const payload = (await response.json()) as UpstashResult<T>;
  if (payload.error) throw new Error(payload.error);
  return (payload.result ?? null) as T | null;
}

function parseRedisValue<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

function clientIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const xRealIp = request.headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;

  const forwarded = request.headers.get("x-forwarded-for");
  const firstForwarded = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean)[0];
  return firstForwarded || "unknown";
}

function isRateLimitingDisabled(): boolean {
  return process.env.NODE_ENV === "test" || process.env.RATE_LIMIT_DISABLED === "true";
}

async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  if (isRateLimitingDisabled()) return null;
  if (!redisConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "TMDB proxy rate limiter is not configured" },
        { status: 503 }
      );
    }
    return null;
  }

  const key = `${RATE_LIMIT_NAMESPACE}:${encodeURIComponent(clientIp(request).toLowerCase())}`;
  let current: number | null = null;
  try {
    current = await redisCommand<number>("incr", key);
    if (current === 1) {
      await redisCommand("expire", key, RATE_LIMIT_WINDOW_SECONDS);
    }
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("TMDB rate limit error:", err);
      return NextResponse.json(
        { error: "TMDB proxy rate limiter is unavailable" },
        { status: 503 }
      );
    }
    console.warn("TMDB rate limit skipped:", err);
    return null;
  }

  const count = typeof current === "number" ? current : 0;
  if (count <= RATE_LIMIT_REQUESTS) return null;

  let ttl = RATE_LIMIT_WINDOW_SECONDS;
  try {
    ttl = (await redisCommand<number>("ttl", key)) ?? RATE_LIMIT_WINDOW_SECONDS;
  } catch (err) {
    console.warn("TMDB rate limit TTL read failed:", err);
  }
  return NextResponse.json(
    { error: "Too many TMDB requests. Please retry later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS),
        "X-RateLimit-Limit": String(RATE_LIMIT_REQUESTS),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

function cacheTtlSeconds(path: string[]): number {
  const pathStr = path.join("/");
  if (pathStr.startsWith("search/")) return 12 * 60 * 60;
  if (pathStr.startsWith("discover/") || pathStr.startsWith("trending/")) return 15 * 60;
  if (pathStr.startsWith("genre/") || pathStr.startsWith("configuration")) return 7 * 24 * 60 * 60;
  return 24 * 60 * 60;
}

async function getCachedResponse(key: string): Promise<CachedTmdbResponse | null> {
  if (!redisConfigured()) return null;

  const raw = await redisCommand<string>("get", key);
  const cached = parseRedisValue<CachedTmdbResponse>(raw);
  if (!cached || typeof cached !== "object") return null;
  if (typeof cached.status !== "number") return null;
  if (!("data" in cached)) return null;
  return cached;
}

async function setCachedResponse(
  key: string,
  value: CachedTmdbResponse,
  ttlSeconds: number
): Promise<void> {
  if (!redisConfigured()) return;
  await redisCommand("setex", key, ttlSeconds, JSON.stringify(value));
}

function cacheKeyFor(url: URL): string {
  const normalized = new URL(url.toString());
  normalized.searchParams.delete("api_key");
  normalized.searchParams.sort();
  return `${CACHE_NAMESPACE}:${encodeURIComponent(normalized.pathname + "?" + normalized.searchParams.toString())}`;
}

function jsonResponse(data: unknown, status: number, cacheState: "HIT" | "MISS" | "BYPASS") {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      "X-35mm-TMDB-Cache": cacheState,
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const rateLimited = await checkRateLimit(request);
  if (rateLimited) return rateLimited;

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const { path } = await params;
  const pathStr = path.join("/");
  const url = new URL(`${TMDB_BASE}/${pathStr}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");

  // Forward query params (e.g. page, with_genres)
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "path") url.searchParams.set(key, value);
  });

  const cacheKey = cacheKeyFor(url);
  try {
    const cached = await getCachedResponse(cacheKey);
    if (cached) {
      return jsonResponse(cached.data, cached.status, "HIT");
    }
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("TMDB cache read error:", err);
      return NextResponse.json(
        { error: "TMDB cache is unavailable" },
        { status: 503 }
      );
    }
    console.warn("TMDB cache read skipped:", err);
  }

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      console.error("TMDB non-JSON response:", res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: "Invalid response from TMDB", status: res.status },
        { status: 502 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    try {
      await setCachedResponse(
        cacheKey,
        { status: res.status, data, cachedAt: new Date().toISOString() },
        cacheTtlSeconds(path)
      );
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        console.error("TMDB cache write error:", err);
        return NextResponse.json(
          { error: "TMDB cache is unavailable" },
          { status: 503 }
        );
      }
      console.warn("TMDB cache write skipped:", err);
    }

    return jsonResponse(data, res.status, redisConfigured() ? "MISS" : "BYPASS");
  } catch (err) {
    console.error("TMDB API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from TMDB" },
      { status: 502 }
    );
  }
}
