import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { profiles } from "@35mm/db/schema";
import { isReservedUsername, usernameSchema } from "@35mm/validators";
import { getDb } from "../../lib/db.js";
import { requireAuth } from "../../lib/middleware.js";
import { badRequest } from "../../lib/errors.js";
import { resolveProfileAvatarUrl } from "../media/url.js";
import { findUsernameLock } from "../../lib/usernameLocks.js";

export var authRoutes = new Hono();

authRoutes.get("/usernames/:username/available", async function (c) {
  var parsed = usernameSchema.safeParse(c.req.param("username"));

  if (!parsed.success) {
    return c.json({ available: false, reason: parsed.error.issues[0]?.message ?? "Invalid username" });
  }

  var username = parsed.data;

  if (isReservedUsername(username)) {
    return c.json({ available: false, reason: "This username is reserved" });
  }

  var db = getDb();
  var [existing, locked] = await Promise.all([
    db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.username, username))
      .limit(1),
    findUsernameLock(db, username),
  ]);

  if (locked) {
    return c.json({ available: false, reason: `This username is ${locked.state}` });
  }

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
      avatarVariants: profiles.avatarVariants,
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
  var [avatarUrl, avatarUrlLg] = await Promise.all([
    resolveProfileAvatarUrl(row.avatarUrl, user.userId, row.avatarVariants, "sm"),
    resolveProfileAvatarUrl(row.avatarUrl, user.userId, row.avatarVariants, "lg"),
  ]);

  return c.json({
    userId: user.userId,
    username: row.username,
    displayName: row.displayName,
    avatarUrl,
    avatarUrlLg,
    role: row.role,
    roleContext: row.roleContext,
    filmsLoggedCount: row.filmsLoggedCount,
  });
});
