import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { cursorPaginationSchema } from "@35mm/validators";

vi.mock("../../lib/middleware.js", function () {
  return {
    getOptionalAuthUser: async function () {
      return null;
    },
    requireAuth: async function (_c: unknown, next: () => Promise<void>) {
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
      return "user";
    },
  };
});

import { listRoutes } from "./routes.js";

function app() {
  var instance = new Hono();
  instance.onError(function (error: any, c) {
    return c.json(
      { code: error.code ?? "INTERNAL_ERROR", message: error.message },
      error.status ?? 500
    );
  });
  return instance.route("/v1/lists", listRoutes);
}

describe("GET /v1/lists", function () {
  it("accepts only supported public-list sort modes", async function () {
    var response = await app().request("/v1/lists?sort=alpha");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Invalid sort" });
  });

  it.each(["format=unknown", "size=huge", "q=" + "a".repeat(101)])("rejects invalid filters: %s", async function (query) {
    const response = await app().request("/v1/lists?" + query);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "Invalid list filters" });
  });

  it("keeps public browse pages bounded", function () {
    expect(function () {
      cursorPaginationSchema.parse({ limit: "101" });
    }).toThrow();
  });
});
