import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRateLimitMiddleware } from "./rateLimit.js";

function stubRequiredEnv() {
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
  vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test");
  vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_test");
}

describe("rate limit fail mode", function () {
  afterEach(function () {
    vi.unstubAllEnvs();
  });

  it("fails closed when Redis is not configured", async function () {
    stubRequiredEnv();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    var app = new Hono();
    app.get(
      "/limited",
      createRateLimitMiddleware({
        keyPrefix: "test",
        limit: 1,
        windowSeconds: 60,
        identify: function () {
          return "user_1";
        },
      }),
      function (c) {
        return c.json({ ok: true });
      }
    );

    var response = await app.request("/limited");
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "RATE_LIMIT_UNAVAILABLE",
    });
  });

  it("uses a bounded local limiter outside production when Redis is not configured", async function () {
    stubRequiredEnv();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

    var app = new Hono();
    app.get(
      "/limited",
      createRateLimitMiddleware({
        keyPrefix: "test-dev-fallback",
        limit: 1,
        windowSeconds: 60,
        identify: function () {
          return "user_1";
        },
      }),
      function (c) {
        return c.json({ ok: true });
      }
    );

    var first = await app.request("/limited");
    expect(first.status).toBe(200);
    expect(first.headers.get("X-RateLimit-Backend")).toBe("memory");

    var second = await app.request("/limited");
    expect(second.status).toBe(429);
    await expect(second.json()).resolves.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});
