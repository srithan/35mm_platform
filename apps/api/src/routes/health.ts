import { Hono } from "hono";
import type { HealthResponse } from "@35mm/types";
import { getRateLimitRedisClient, isRedisEnabled } from "../lib/redis.js";
import { isQueueEnabled } from "../lib/jobs.js";

export const healthRoutes = new Hono();

healthRoutes.get("/", function (c) {
  const body: HealthResponse = {
    ok: true,
    service: "35mm-api",
    version: "0.1.0",
    feedCache: isRedisEnabled() ? "ok" : "disabled",
    rateLimitRedis: getRateLimitRedisClient() ? "ok" : "disabled",
    jobsQueue: isQueueEnabled() ? "ok" : "disabled",
  };

  return c.json(body);
});
