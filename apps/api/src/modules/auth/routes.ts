import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { profiles } from "@35mm/db/schema";
import { getDb } from "../../lib/db.js";
import { requireAuth } from "../../lib/middleware.js";
import { badRequest } from "../../lib/errors.js";
import { resolvePublicMediaUrl } from "../media/url.js";

export var authRoutes = new Hono();

var USERNAME_RE = /^[a-zA-Z0-9._]+$/;
var RESERVED_USERNAMES = new Set([
  "admin", "api", "help", "support", "about", "terms", "privacy",
  "settings", "notifications", "bookmarks", "discover", "new", "login",
  "signup", "forgot", "reset", "verify", "onboarding", "landing",
]);

authRoutes.get("/usernames/:username/available", async function (c) {
  var username = c.req.param("username").toLowerCase().trim();

  if (username.length < 2) {
    return c.json({ available: false, reason: "Username must be at least 2 characters" });
  }

  if (!USERNAME_RE.test(username)) {
    return c.json({ available: false, reason: "Letters, numbers, dots and underscores only" });
  }

  if (RESERVED_USERNAMES.has(username)) {
    return c.json({ available: false, reason: "This username is reserved" });
  }

  var db = getDb();
  var existing = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ available: false, reason: "Username is already taken" });
  }

  return c.json({ available: true });
});

authRoutes.get("/me", requireAuth, async function (c) {
  var user = c.get("user");
  var db = getDb();
  var rows = await db
    .select({
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
      roleContext: profiles.roleContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);

  if (rows.length === 0) {
    throw badRequest("Profile not found for authenticated user");
  }

  var row = rows[0];
  var avatarUrl = await resolvePublicMediaUrl(row.avatarUrl);

  return c.json({
    userId: user.userId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl,
    role: row.role,
    roleContext: row.roleContext,
    filmsLoggedCount: row.filmsLoggedCount,
  });
});
