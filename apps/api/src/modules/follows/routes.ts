import { Hono } from "hono";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { feedItems, follows, posts, profiles, users } from "@35mm/db/schema";
import { getDb } from "../../lib/db.js";
import { assertNoBlockBetween } from "../../lib/moderation.js";
import { requireAuth } from "../../lib/middleware.js";
import { badRequest, notFound } from "../../lib/errors.js";
import {
  invalidateAuthorProfileFeedCaches,
  invalidateViewerFeedCaches,
} from "../../lib/feedCache.js";

export var followRoutes = new Hono();
const FOLLOW_BACKFILL_LIMIT = 200;

async function assertTargetExists(userId: string) {
  var db = getDb();
  var rows = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("User not found");
  }

  if (rows[0].status !== "active") {
    throw notFound("User not found");
  }
}

async function isPrivateAccount(userId: string): Promise<boolean> {
  var db = getDb();
  var rows = await db
    .select({ isPrivate: profiles.isPrivate })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return Boolean(rows[0]?.isPrivate ?? false);
}

followRoutes.post("/:userId", requireAuth, async function (c) {
  var user = c.get("user");
  var followingId = c.req.param("userId");

  if (followingId === user.userId) {
    throw badRequest("Cannot follow yourself");
  }

  await assertTargetExists(followingId);
  await assertNoBlockBetween(user.userId, followingId);
  var targetIsPrivate = await isPrivateAccount(followingId);

  var db = getDb();
  var inserted = await db
    .insert(follows)
    .values({
      followerId: user.userId,
      followingId,
      status: targetIsPrivate ? "pending" : "accepted",
    })
    .onConflictDoNothing()
    .returning({ followerId: follows.followerId, status: follows.status });

  // Backfill recent visible posts into the follower's materialized feed so
  // newly-followed accounts appear immediately without waiting for next post.
  var recentPosts = targetIsPrivate
    ? []
    : await db
    .select({ postId: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.userId, followingId),
        eq(posts.isDeleted, false),
        ne(posts.visibility, "private")
      )
    )
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(FOLLOW_BACKFILL_LIMIT);

  if (recentPosts.length > 0) {
    var postIds = recentPosts.map(function (row) {
      return row.postId;
    });

    var existingFeedRows = await db
      .select({ postId: feedItems.postId })
      .from(feedItems)
      .where(and(eq(feedItems.userId, user.userId), inArray(feedItems.postId, postIds)));

    var existingPostIdSet = new Set<string>(
      existingFeedRows.map(function (row) {
        return row.postId;
      })
    );

    var missingFeedRows = postIds
      .filter(function (postId) {
        return !existingPostIdSet.has(postId);
      })
      .map(function (postId) {
        return {
          userId: user.userId,
          postId: postId,
          score: null,
        };
      });

    if (missingFeedRows.length > 0) {
      await db.insert(feedItems).values(missingFeedRows);
    }
  }

  await invalidateViewerFeedCaches([user.userId]);
  await invalidateAuthorProfileFeedCaches([followingId]);

  return c.json({
    ok: true,
    isFollowing: inserted[0]?.status === "accepted",
    status: inserted[0]?.status ?? (targetIsPrivate ? "pending" : "accepted"),
    created: inserted.length > 0,
  });
});

followRoutes.delete("/:userId", requireAuth, async function (c) {
  var user = c.get("user");
  var followingId = c.req.param("userId");

  if (followingId === user.userId) {
    throw badRequest("Cannot unfollow yourself");
  }

  await assertTargetExists(followingId);

  var db = getDb();
  var deleted = await db
    .delete(follows)
    .where(and(eq(follows.followerId, user.userId), eq(follows.followingId, followingId)))
    .returning({ followerId: follows.followerId });

  if (deleted.length > 0) {
    await db
      .delete(feedItems)
      .where(
        and(
          eq(feedItems.userId, user.userId),
          sql<boolean>`exists(
            select 1
            from ${posts}
            where ${posts.id} = ${feedItems.postId}
              and ${posts.userId} = ${followingId}
          )`
        )
      );
  }

  await invalidateViewerFeedCaches([user.userId]);
  await invalidateAuthorProfileFeedCaches([followingId]);

  return c.json({
    ok: true,
    isFollowing: false,
    deleted: deleted.length > 0,
  });
});

followRoutes.post("/:userId/accept", requireAuth, async function (c) {
  var user = c.get("user");
  var followerId = c.req.param("userId");

  if (followerId === user.userId) {
    throw badRequest("Cannot accept yourself");
  }

  await assertTargetExists(followerId);

  var db = getDb();
  var updated = await db
    .update(follows)
    .set({ status: "accepted" })
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, user.userId),
        eq(follows.status, "pending")
      )
    )
    .returning({ followerId: follows.followerId });

  if (updated.length > 0) {
    await invalidateViewerFeedCaches([followerId]);
    await invalidateAuthorProfileFeedCaches([user.userId]);
  }

  return c.json({ ok: true, accepted: updated.length > 0 });
});

followRoutes.delete("/:userId/request", requireAuth, async function (c) {
  var user = c.get("user");
  var followerId = c.req.param("userId");

  if (followerId === user.userId) {
    throw badRequest("Cannot decline yourself");
  }

  await assertTargetExists(followerId);

  var db = getDb();
  var deleted = await db
    .delete(follows)
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, user.userId),
        eq(follows.status, "pending")
      )
    )
    .returning({ followerId: follows.followerId });

  if (deleted.length > 0) {
    await invalidateViewerFeedCaches([followerId]);
    await invalidateAuthorProfileFeedCaches([user.userId]);
  }

  return c.json({ ok: true, declined: deleted.length > 0 });
});
