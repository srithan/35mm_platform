import { Hono } from "hono";
import { siteSearchQuerySchema } from "@35mm/validators";
import { badRequest, serviceUnavailable } from "../../lib/errors.js";
import { loadEnv } from "../../lib/env.js";
import { requireAuth } from "../../lib/middleware.js";
import {
  createRateLimitMiddleware,
  identifyByUserId,
} from "../../lib/rateLimit.js";
import { searchSite } from "./service.js";

export var searchRoutes = new Hono();

var searchRateLimit = createRateLimitMiddleware({
  keyPrefix: "search:site",
  limit: 120,
  windowSeconds: 60,
  identify: identifyByUserId,
});

function parseQuery(value: unknown) {
  var parsed = siteSearchQuerySchema.safeParse(value);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid search query");
  }
  return parsed.data;
}

searchRoutes.get("/", requireAuth, searchRateLimit, async function (c) {
  var env = loadEnv();
  if (!env.MEILISEARCH_HOST || !env.MEILISEARCH_SEARCH_API_KEY) {
    throw serviceUnavailable("SEARCH_UNAVAILABLE", "Search is not configured");
  }
  var input = parseQuery({
    q: c.req.query("q"),
    limit: c.req.query("limit"),
  });
  var user = c.get("user");

  try {
    return c.json(
      await searchSite({
        query: input.q,
        limit: input.limit,
        viewerUserId: user.userId,
      })
    );
  } catch (error) {
    console.error("[search] query failed", {
      viewerUserId: user.userId,
      queryLength: input.q.length,
      error,
    });
    throw serviceUnavailable("SEARCH_UNAVAILABLE", "Search is temporarily unavailable");
  }
});
