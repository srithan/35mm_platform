import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadEnv } from "./lib/env.js";
import { initDb } from "./lib/db.js";
import { errorHandler } from "./lib/middleware.js";
import { ApiError } from "./lib/errors.js";
import { healthRoutes } from "./routes/health.js";
import { feedRoutes } from "./modules/feed/routes.js";
import { chatRoutes } from "./modules/chat/routes.js";
import { webhookRoutes } from "./modules/webhooks/routes.js";
import { authRoutes } from "./modules/auth/routes.js";
import { profileRoutes } from "./modules/profiles/routes.js";
import { followRoutes } from "./modules/follows/routes.js";
import { suggestionsRoutes } from "./routes/suggestions.js";
import { settingsRoutes } from "./modules/settings/routes.js";
import { mediaRoutes } from "./modules/media/routes.js";
import { onboardingRoutes } from "./modules/onboarding/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { notificationsRoutes } from "./modules/notifications/routes.js";
import { listRoutes } from "./modules/lists/routes.js";
import { emailRoutes } from "./modules/email/routes.js";
import { isRedisEnabled } from "./lib/redis.js";
import { isQueueEnabled } from "./lib/jobs.js";
import posterProxy from "./routes/poster-proxy.js";

var env = loadEnv();

initDb(env.DATABASE_URL);

var app = new Hono();

console.log(
  isRedisEnabled()
    ? "[feed-cache] enabled"
    : "[feed-cache] disabled (missing Upstash REST env)"
);
console.log(
  isQueueEnabled()
    ? "[jobs-queue] enabled"
    : "[jobs-queue] disabled (missing UPSTASH_REDIS_URL)"
);

app.onError(function (err, c) {
  if (
    err instanceof ApiError ||
    (err != null &&
      typeof err === "object" &&
      typeof (err as { status?: unknown }).status === "number" &&
      typeof (err as { code?: unknown }).code === "string")
  ) {
    var apiError = err as ApiError;
    return c.json(
      { code: apiError.code, message: apiError.message },
      apiError.status as 400
    );
  }

  console.error("Unhandled error:", err);
  return c.json(
    { code: "INTERNAL_ERROR", message: "Something went wrong" },
    500
  );
});

app.use("*", cors({
  origin: env.CORS_ORIGINS,
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
}));

app.use("*", errorHandler);

app.route("/health", healthRoutes);

app.route("/poster-proxy", posterProxy);
app.route("/v1/webhooks", webhookRoutes);
app.route("/v1", authRoutes);
app.route("/v1", onboardingRoutes);
app.route("/v1/profiles", profileRoutes);
app.route("/v1/follows", followRoutes);
app.route("/v1", suggestionsRoutes);
app.route("/v1", notificationsRoutes);
app.route("/v1/lists", listRoutes);
app.route("/v1/me/settings", settingsRoutes);
app.route("/v1/media", mediaRoutes);
app.route("/v1/email", emailRoutes);
app.route("/v1", userRoutes);

app.route("/v1/feed", feedRoutes);
app.route("/v1/chat", chatRoutes);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  function () {
    console.log("35mm API listening on http://localhost:" + env.PORT);
  }
);
