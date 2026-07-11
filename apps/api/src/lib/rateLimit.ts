import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { getRateLimitRedisClient } from "./redis.js";
import { loadEnv } from "./env.js";

type RateLimitConfig = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  identify: (c: Context) => Promise<string | null> | string | null;
};

type RateLimitCheckInput = {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  identifier: string | null;
};

type LocalRateLimitEntry = {
  count: number;
  resetAt: number;
};

var globalForRateLimit = globalThis as typeof globalThis & {
  __thirtyFiveMmLocalRateLimit?: Map<string, LocalRateLimitEntry>;
};

var localRateLimitStore =
  globalForRateLimit.__thirtyFiveMmLocalRateLimit ??
  new Map<string, LocalRateLimitEntry>();

globalForRateLimit.__thirtyFiveMmLocalRateLimit = localRateLimitStore;

function rateLimitingDisabled(): boolean {
  var env = loadEnv();
  if (env.RATE_LIMIT_DISABLED) return true;
  return env.NODE_ENV === "test";
}

function localFallbackEnabled(): boolean {
  return loadEnv().NODE_ENV !== "production";
}

function ipFromRequest(c: Context): string | null {
  var cfConnectingIp = c.req.header("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim().length > 0) return cfConnectingIp.trim();

  var xRealIp = c.req.header("x-real-ip");
  if (xRealIp && xRealIp.trim().length > 0) return xRealIp.trim();

  var forwarded = c.req.header("x-forwarded-for");
  if (!forwarded) return "unknown";
  var parts = forwarded
    .split(",")
    .map(function (part) {
      return part.trim();
    })
    .filter(Boolean);
  return parts[0] ?? "unknown";
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  return createMiddleware(async function (c, next) {
    if (rateLimitingDisabled()) {
      await next();
      return;
    }

    var identifier = await config.identify(c);
    var blockedResponse = await applyRateLimit(c, {
      keyPrefix: config.keyPrefix,
      limit: config.limit,
      windowSeconds: config.windowSeconds,
      identifier,
    });
    if (blockedResponse) return blockedResponse;

    await next();
  });
}

export function identifyByIp(c: Context): string | null {
  return ipFromRequest(c);
}

export function identifyByUserId(c: Context): string | null {
  var user = c.get("user") as { userId?: string } | undefined;
  return typeof user?.userId === "string" ? user.userId : null;
}

function localRateLimitKey(input: RateLimitCheckInput): string {
  return (
    "rate-limit:v1:" +
    input.keyPrefix +
    ":" +
    encodeURIComponent((input.identifier ?? "").trim().toLowerCase())
  );
}

function applyLocalRateLimit(
  c: Context,
  input: RateLimitCheckInput
): Response | null {
  var key = localRateLimitKey(input);
  var now = Date.now();
  var entry = localRateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + input.windowSeconds * 1000 };
  }

  entry.count += 1;
  localRateLimitStore.set(key, entry);

  var remaining = Math.max(input.limit - entry.count, 0);
  c.header("X-RateLimit-Limit", String(input.limit));
  c.header("X-RateLimit-Remaining", String(remaining));
  c.header("X-RateLimit-Backend", "memory");

  if (entry.count > input.limit) {
    var retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);
    c.header("Retry-After", String(retryAfter));
    return c.json(
      {
        code: "RATE_LIMITED",
        message: "Too many requests. Please retry later.",
      },
      429
    );
  }

  return null;
}

export async function applyRateLimit(
  c: Context,
  input: RateLimitCheckInput
): Promise<Response | null> {
  if (rateLimitingDisabled()) return null;
  if (!input.identifier) {
    console.error("[rate-limit] missing identifier", {
      keyPrefix: input.keyPrefix,
    });
    return c.json(
      {
        code: "RATE_LIMIT_IDENTITY_UNAVAILABLE",
        message: "Rate limit identity is unavailable.",
      },
      503
    );
  }

  var redis = getRateLimitRedisClient();
  if (!redis) {
    if (localFallbackEnabled()) {
      console.warn("[rate-limit] redis unavailable; using local memory limiter", {
        keyPrefix: input.keyPrefix,
      });
      return applyLocalRateLimit(c, input);
    }
    console.error("[rate-limit] redis unavailable", {
      keyPrefix: input.keyPrefix,
    });
    return c.json(
      {
        code: "RATE_LIMIT_UNAVAILABLE",
        message: "Rate limiting is unavailable. Please retry later.",
      },
      503
    );
  }

  var key =
    "rate-limit:v1:" +
    input.keyPrefix +
    ":" +
    encodeURIComponent(input.identifier.trim().toLowerCase());

  try {
    var current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, input.windowSeconds);
    }

    var remaining = Math.max(input.limit - current, 0);

    c.header("X-RateLimit-Limit", String(input.limit));
    c.header("X-RateLimit-Remaining", String(remaining));

    if (current > input.limit) {
      var ttl = await redis.ttl(key);
      var retryAfter = ttl > 0 ? ttl : input.windowSeconds;
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          code: "RATE_LIMITED",
          message: "Too many requests. Please retry later.",
        },
        429
      );
    }
  } catch (error) {
    if (localFallbackEnabled()) {
      console.warn("[rate-limit] redis check failed; using local memory limiter", {
        keyPrefix: input.keyPrefix,
        error,
      });
      return applyLocalRateLimit(c, input);
    }
    console.error("[rate-limit] redis check failed", {
      keyPrefix: input.keyPrefix,
      error,
    });
    return c.json(
      {
        code: "RATE_LIMIT_UNAVAILABLE",
        message: "Rate limiting is unavailable. Please retry later.",
      },
      503
    );
  }

  return null;
}
