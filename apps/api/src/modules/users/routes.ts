import { Hono } from "hono";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { profiles, follows, userBlocks, userMutes, users } from "@35mm/db/schema";
import { getDb } from "../../lib/db.js";
import { purgeFeedItemsBetweenUsers } from "../../lib/moderation.js";
import { requireAuth } from "../../lib/middleware.js";
import { badRequest, notFound } from "../../lib/errors.js";
import {
  invalidateAuthorProfileFeedCaches,
  invalidateViewerFeedCaches,
} from "../../lib/feedCache.js";
import { cursorPaginationSchema } from "@35mm/validators";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { resolvePublicMediaUrl } from "../media/url.js";

export var userRoutes = new Hono();

async function assertTargetUser(userId: string) {
  var db = getDb();
  var rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (rows.length === 0) throw notFound("User not found");
}

userRoutes.post("/users/:userId/block", requireAuth, async function (c) {
  var user = c.get("user");
  var targetUserId = c.req.param("userId");
  if (targetUserId === user.userId) throw badRequest("Cannot block yourself");
  await assertTargetUser(targetUserId);

  var db = getDb();
  await db
    .insert(userBlocks)
    .values({
      blockerId: user.userId,
      blockedId: targetUserId,
    })
    .onConflictDoNothing();

  await db
    .delete(follows)
    .where(
      or(
        and(eq(follows.followerId, user.userId), eq(follows.followingId, targetUserId)),
        and(eq(follows.followerId, targetUserId), eq(follows.followingId, user.userId))
      )
    );

  await db
    .insert(userMutes)
    .values({
      muterId: user.userId,
      mutedId: targetUserId,
    })
    .onConflictDoNothing();

  await purgeFeedItemsBetweenUsers(user.userId, targetUserId);
  await invalidateViewerFeedCaches([user.userId, targetUserId]);
  await invalidateAuthorProfileFeedCaches([user.userId, targetUserId]);

  return c.json({ ok: true });
});

userRoutes.delete("/users/:userId/block", requireAuth, async function (c) {
  var user = c.get("user");
  var targetUserId = c.req.param("userId");
  if (targetUserId === user.userId) throw badRequest("Cannot unblock yourself");
  await assertTargetUser(targetUserId);

  var db = getDb();
  await db
    .delete(userBlocks)
    .where(and(eq(userBlocks.blockerId, user.userId), eq(userBlocks.blockedId, targetUserId)));
  await invalidateViewerFeedCaches([user.userId, targetUserId]);
  await invalidateAuthorProfileFeedCaches([user.userId, targetUserId]);

  return c.json({ ok: true });
});

userRoutes.post("/users/:userId/mute", requireAuth, async function (c) {
  var user = c.get("user");
  var targetUserId = c.req.param("userId");
  if (targetUserId === user.userId) throw badRequest("Cannot mute yourself");
  await assertTargetUser(targetUserId);

  var db = getDb();
  await db
    .insert(userMutes)
    .values({
      muterId: user.userId,
      mutedId: targetUserId,
    })
    .onConflictDoNothing();

  await invalidateViewerFeedCaches([user.userId]);

  return c.json({ ok: true });
});

userRoutes.delete("/users/:userId/mute", requireAuth, async function (c) {
  var user = c.get("user");
  var targetUserId = c.req.param("userId");
  if (targetUserId === user.userId) throw badRequest("Cannot unmute yourself");
  await assertTargetUser(targetUserId);

  var db = getDb();
  await db
    .delete(userMutes)
    .where(and(eq(userMutes.muterId, user.userId), eq(userMutes.mutedId, targetUserId)));

  await invalidateViewerFeedCaches([user.userId]);

  return c.json({ ok: true });
});

userRoutes.get("/me/blocks", requireAuth, async function (c) {
  var user = c.get("user");
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var db = getDb();

  var cursorFilter = cursor
    ? or(
        lt(userBlocks.createdAt, cursor.createdAt),
        and(eq(userBlocks.createdAt, cursor.createdAt), lt(userBlocks.blockedId, cursor.id))
      )
    : undefined;

  var rows = await db
    .select({
      cursorCreatedAt: userBlocks.createdAt,
      cursorId: userBlocks.blockedId,
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(userBlocks)
    .innerJoin(profiles, eq(profiles.userId, userBlocks.blockedId))
    .where(
      cursorFilter
        ? and(eq(userBlocks.blockerId, user.userId), cursorFilter)
        : eq(userBlocks.blockerId, user.userId)
    )
    .orderBy(desc(userBlocks.createdAt), desc(userBlocks.blockedId))
    .limit(parsed.limit + 1);

  var visible = rows.slice(0, parsed.limit);
  var hasMore = rows.length > parsed.limit;
  var tail = visible[visible.length - 1];

  return c.json({
    items: await Promise.all(
      visible.map(async function (row) {
        return {
          userId: row.userId,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: await resolvePublicMediaUrl(row.avatarUrl),
        };
      })
    ),
    nextCursor:
      hasMore && tail
        ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
        : null,
    hasMore,
  });
});

userRoutes.get("/me/mutes", requireAuth, async function (c) {
  var user = c.get("user");
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var db = getDb();

  var cursorFilter = cursor
    ? or(
        lt(userMutes.createdAt, cursor.createdAt),
        and(eq(userMutes.createdAt, cursor.createdAt), lt(userMutes.mutedId, cursor.id))
      )
    : undefined;

  var rows = await db
    .select({
      cursorCreatedAt: userMutes.createdAt,
      cursorId: userMutes.mutedId,
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(userMutes)
    .innerJoin(profiles, eq(profiles.userId, userMutes.mutedId))
    .where(
      cursorFilter
        ? and(eq(userMutes.muterId, user.userId), cursorFilter)
        : eq(userMutes.muterId, user.userId)
    )
    .orderBy(desc(userMutes.createdAt), desc(userMutes.mutedId))
    .limit(parsed.limit + 1);

  var visible = rows.slice(0, parsed.limit);
  var hasMore = rows.length > parsed.limit;
  var tail = visible[visible.length - 1];

  return c.json({
    items: await Promise.all(
      visible.map(async function (row) {
        return {
          userId: row.userId,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: await resolvePublicMediaUrl(row.avatarUrl),
        };
      })
    ),
    nextCursor:
      hasMore && tail
        ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
        : null,
    hasMore,
  });
});
