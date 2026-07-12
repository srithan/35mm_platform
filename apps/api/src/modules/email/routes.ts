import { createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users, type NotificationEmailPreferences } from "@35mm/db/schema";
import { badRequest } from "../../lib/errors.js";
import { getDb } from "../../lib/db.js";
import { loadEnv } from "../../lib/env.js";
import { createRateLimitMiddleware, identifyByIp } from "../../lib/rateLimit.js";

type EmailNotificationType =
  | "like"
  | "repost"
  | "follow"
  | "follow_request"
  | "follow_request_approved"
  | "comment"
  | "reply"
  | "mention"
  | "film_logged"
  | "report_status_update"
  | "content_moderated"
  | "content_under_review";

var EMAIL_NOTIFICATION_TYPES = new Set<string>([
  "like",
  "repost",
  "follow",
  "follow_request",
  "follow_request_approved",
  "comment",
  "reply",
  "mention",
  "film_logged",
  "report_status_update",
  "content_moderated",
  "content_under_review",
]);

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  var left = Buffer.from(a);
  var right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function parseUnsubscribeToken(token: string, secret: string): {
  userId: string;
  type: EmailNotificationType;
} | null {
  var parts = token.split(".");
  if (parts.length !== 2) return null;

  var payload = parts[0];
  var signature = parts[1];
  if (!payload || !signature) return null;

  var expected = signPayload(payload, secret);
  if (!safeEqual(signature, expected)) return null;

  try {
    var parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      userId?: unknown;
      type?: unknown;
    };
    if (typeof parsed.userId !== "string" || typeof parsed.type !== "string") return null;
    if (!EMAIL_NOTIFICATION_TYPES.has(parsed.type)) return null;
    return {
      userId: parsed.userId,
      type: parsed.type as EmailNotificationType,
    };
  } catch (_error) {
    return null;
  }
}

async function unsubscribe(token: string): Promise<EmailNotificationType> {
  var env = loadEnv();
  var secret = env.EMAIL_UNSUBSCRIBE_SECRET.trim();
  if (!secret) {
    throw badRequest("Email unsubscribe is not configured");
  }

  var parsed = parseUnsubscribeToken(token.trim(), secret);
  if (!parsed) {
    throw badRequest("Invalid unsubscribe link");
  }

  var db = getDb();
  var rows = await db
    .select({
      preferences: users.notificationEmailPreferences,
    })
    .from(users)
    .where(eq(users.id, parsed.userId))
    .limit(1);

  var current = rows[0]?.preferences;
  var preferences: NotificationEmailPreferences = isObjectRecord(current)
    ? JSON.parse(JSON.stringify(current)) as NotificationEmailPreferences
    : {};
  var existing = isObjectRecord(preferences[parsed.type]) ? preferences[parsed.type] : {};
  preferences[parsed.type] = {
    ...existing,
    enabled: false,
  };

  await db
    .update(users)
    .set({
      notificationEmailPreferences: preferences,
      updatedAt: new Date(),
    })
    .where(eq(users.id, parsed.userId));

  return parsed.type;
}

export var emailRoutes = new Hono();

var unsubscribeRateLimit = createRateLimitMiddleware({
  keyPrefix: "email:unsubscribe",
  limit: 30,
  windowSeconds: 60,
  identify: identifyByIp,
});

emailRoutes.get("/unsubscribe", async function (c) {
  var token = c.req.query("token") ?? "";
  var type = await unsubscribe(token);
  return c.html(
    "<!doctype html><meta charset=\"utf-8\"><title>Unsubscribed</title><body style=\"font-family: system-ui, sans-serif; padding: 32px;\"><h1>Unsubscribed</h1><p>You will no longer receive this kind of 35mm notification email.</p><p>Preference: " +
      type +
      "</p></body>"
  );
});

emailRoutes.post("/unsubscribe", unsubscribeRateLimit, async function (c) {
  var token = c.req.query("token") ?? "";
  var type = await unsubscribe(token);
  return c.json({ ok: true, type });
});
