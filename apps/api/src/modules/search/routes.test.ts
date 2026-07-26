import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { siteSearchQuerySchema } from "@35mm/validators";

describe("site search validator", function () {
  it("requires at least two query characters and bounds per-type results", function () {
    expect(function () {
      siteSearchQuerySchema.parse({ q: "a", limit: "5" });
    }).toThrow();
    expect(function () {
      siteSearchQuerySchema.parse({ q: "alien", limit: "9" });
    }).toThrow();
    expect(siteSearchQuerySchema.parse({ q: " alien ", limit: "5" })).toEqual({
      q: "alien",
      limit: 5,
    });
  });
});

describe("site search route", function () {
  afterEach(function () {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("passes authenticated viewer context to search service", async function () {
    var calls: unknown[] = [];
    vi.doMock("../../lib/middleware.js", function () {
      return {
        requireAuth: async function (c: any, next: () => Promise<void>) {
          c.set("user", {
            userId: "00000000-0000-4000-8000-000000000001",
          });
          await next();
        },
      };
    });
    vi.doMock("../../lib/rateLimit.js", function () {
      return {
        identifyByUserId: function () {
          return "viewer";
        },
        createRateLimitMiddleware: function () {
          return async function (_c: any, next: () => Promise<void>) {
            await next();
          };
        },
      };
    });
    vi.doMock("../../lib/env.js", function () {
      return {
        loadEnv: function () {
          return {
            MEILISEARCH_HOST: "https://search.example.com",
            MEILISEARCH_SEARCH_API_KEY: "search-key",
          };
        },
      };
    });
    vi.doMock("./service.js", function () {
      return {
        searchSite: async function (input: unknown) {
          calls.push(input);
          return { items: [], nextCursor: null, hasMore: false };
        },
      };
    });

    var { searchRoutes } = await import("./routes.js");
    var app = new Hono();
    app.onError(function (error: any, c) {
      return c.json(
        { code: error.code ?? "INTERNAL_ERROR", message: error.message },
        error.status ?? 500
      );
    });
    app.route("/v1/search", searchRoutes);
    var response = await app.request("/v1/search?q=alien&limit=4", {
      headers: { Authorization: "Bearer test" },
    });

    expect(response.status).toBe(200);
    expect(calls).toEqual([
      {
        query: "alien",
        limit: 4,
        viewerUserId: "00000000-0000-4000-8000-000000000001",
      },
    ]);
  });
});
