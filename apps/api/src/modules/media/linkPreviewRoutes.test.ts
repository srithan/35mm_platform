import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { mediaRoutes } from "./routes.js";

const mocks = vi.hoisted(function () {
  return {
    get: vi.fn(),
    setex: vi.fn(),
    scrape: vi.fn(),
  };
});

vi.mock("../../lib/middleware.js", function () {
  return {
    requireAuth: async function (c: any, next: () => Promise<void>) {
      c.set("user", { userId: "user_1" });
      await next();
    },
  };
});

vi.mock("../../lib/rateLimit.js", function () {
  return {
    createRateLimitMiddleware: function () {
      return async function (_c: unknown, next: () => Promise<void>) {
        await next();
      };
    },
    identifyByUserId: function () {
      return "user_1";
    },
  };
});

vi.mock("../../lib/redis.js", function () {
  return {
    getRedisClient: function () {
      return {
        get: mocks.get,
        setex: mocks.setex,
      };
    },
  };
});

vi.mock("open-graph-scraper", function () {
  return { default: mocks.scrape };
});

function app() {
  return new Hono().route("/v1/media", mediaRoutes);
}

describe("GET /v1/media/oembed", function () {
  beforeEach(function () {
    mocks.get.mockReset();
    mocks.setex.mockReset();
    mocks.scrape.mockReset();
  });

  it("normalizes and caches publisher metadata", async function () {
    mocks.get.mockResolvedValue(null);
    mocks.scrape.mockResolvedValue({
      error: false,
      html: "",
      response: {},
      result: {
        ogTitle: " Example story ",
        ogDescription: " Story description ",
        ogImage: [{ url: "/story.jpg" }],
      },
    });

    var response = await app().request(
      "/v1/media/oembed?url=" + encodeURIComponent("https://www.example.com/story")
    );
    var body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Link-Preview-Cache")).toBe("miss");
    expect(body).toEqual({
      url: "https://www.example.com/story",
      title: "Example story",
      description: "Story description",
      image: "https://www.example.com/story.jpg",
      domain: "example.com",
      provider: "link",
    });
    expect(mocks.setex).toHaveBeenCalledWith(expect.stringMatching(/^link-preview:v1:/), 21600, body);
  });

  it("serves a shared cached preview without another publisher fetch", async function () {
    var cached = {
      url: "https://example.com/story",
      title: "Cached story",
      description: null,
      image: null,
      domain: "example.com",
      provider: "link",
    };
    mocks.get.mockResolvedValue(cached);

    var response = await app().request(
      "/v1/media/oembed?url=" + encodeURIComponent("https://example.com/story")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Link-Preview-Cache")).toBe("hit");
    expect(await response.json()).toEqual(cached);
    expect(mocks.scrape).not.toHaveBeenCalled();
    expect(mocks.setex).not.toHaveBeenCalled();
  });
});
