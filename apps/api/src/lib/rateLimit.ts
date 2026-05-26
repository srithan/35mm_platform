import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { getRedisClient } from "./redis.js";
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

function rateLimitingDisabled(): boolean {
  var env = loadEnv();
  if (env.RATE_LIMIT_DISABLED) return true;
  return env.NODE_ENV === "test";
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

    var redis = getRedisClient();
    if (!redis) {
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

export async function applyRateLimit(
  c: Context,
  input: RateLimitCheckInput
): Promise<Response | null> {
  if (rateLimitingDisabled()) return null;
  if (!input.identifier) return null;

  var redis = getRedisClient();
  if (!redis) return null;

  var key =
    "rate-limit:v1:" +
    input.keyPrefix +
    ":" +
    encodeURIComponent(input.identifier.trim().toLowerCase());

  var current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, input.windowSeconds);
  }

  var ttl = await redis.ttl(key);
  var retryAfter = ttl > 0 ? ttl : input.windowSeconds;
  var remaining = Math.max(input.limit - current, 0);

  c.header("X-RateLimit-Limit", String(input.limit));
  c.header("X-RateLimit-Remaining", String(remaining));

  if (current > input.limit) {
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
