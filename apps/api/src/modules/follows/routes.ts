import { Hono } from "hono";
import { and, desc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { computeFeedScore } from "@35mm/types";
import { feedItems, follows, posts, profiles, users } from "@35mm/db/schema";
import { getDb, getWriteDb } from "../../lib/db.js";
import { createNotification } from "../../lib/notifications.js";
import type { CounterIncrementJobPayload } from "../../lib/jobs.js";
import { recordCounterDeltas, wakeCounterOutbox } from "../../lib/counterOutbox.js";
import { assertNoBlockBetween } from "../../lib/moderation.js";
import { enqueueSuggestionRefresh } from "../../lib/queues/suggestionQueue.js";
import { requireAuth } from "../../lib/middleware.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import {
  invalidateAuthorProfileFeedCaches,
  invalidateViewerFeedCaches,
} from "../../lib/feedCache.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";
import { feedHighFollowerThreshold } from "../feed/fanoutConfig.js";
import { resolveProfileAvatarUrl, type AvatarVariants } from "../media/url.js";

export var followRoutes = new Hono();
const FOLLOW_BACKFILL_LIMIT = 200;

var followWriteRateLimit = createRateLimitMiddleware({
  keyPrefix: "follows:write",
  limit: 60,
  windowSeconds: 60,
  identify: identifyByUserId,
});
var MAX_MUTUAL_FOLLOWER_COUNTS_PER_PAGE = 24;

async function isHighFollowerAccount(userId: string): Promise<boolean> {
  var db = getDb();
  var rows = await db
    .select({ value: profiles.followerCount })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return Number(rows[0]?.value ?? 0) >= feedHighFollowerThreshold();
}

function followCounterDeltas(input: {
  followerId: string;
  followingId: string;
  delta: 1 | -1;
}): CounterIncrementJobPayload[] {
  return [
    {
      targetTable: "profiles",
      targetId: input.followingId,
      counterName: "followerCount",
      delta: input.delta,
    },
    {
      targetTable: "profiles",
      targetId: input.followerId,
      counterName: "followingCount",
      delta: input.delta,
    },
  ];
}

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

async function mutualFollowerCountsForRequesters(
  viewerId: string,
  requesterIds: string[]
): Promise<Map<string, number>> {
  if (requesterIds.length === 0) return new Map<string, number>();

  if (await isHighFollowerAccount(viewerId)) {
    return new Map<string, number>();
  }

  var requesterFollower = alias(follows, "requester_follower");
  var viewerFollower = alias(follows, "viewer_follower");
  var rows = await getDb()
    .select({
      requesterId: follows.followerId,
      mutualFollowerCount: sql<number>`count(distinct ${viewerFollower.followerId})`,
    })
    .from(follows)
    .leftJoin(
      requesterFollower,
      and(
        eq(requesterFollower.followingId, follows.followerId),
        eq(requesterFollower.status, "accepted")
      )
    )
    .leftJoin(
      viewerFollower,
      and(
        eq(viewerFollower.followingId, viewerId),
        eq(viewerFollower.status, "accepted"),
        eq(viewerFollower.followerId, requesterFollower.followerId)
      )
    )
    .where(
      and(
        eq(follows.followingId, viewerId),
        eq(follows.status, "pending"),
        inArray(follows.followerId, requesterIds)
      )
    )
    .groupBy(follows.followerId)
    .orderBy(desc(follows.createdAt), desc(follows.followerId));

  var map = new Map<string, number>();
  var index = 0;
  for (index = 0; index < rows.length; index += 1) {
    var row = rows[index];
    map.set(row.requesterId, Number(row.mutualFollowerCount ?? 0));
  }

  return map;
}

followRoutes.post("/:userId", requireAuth, followWriteRateLimit, async function (c) {
  var user = c.get("user");
  var followingId = c.req.param("userId");

  if (followingId === user.userId) {
    throw badRequest("Cannot follow yourself");
  }

  await assertTargetExists(followingId);
  await assertNoBlockBetween(user.userId, followingId);
  var targetIsPrivate = await isPrivateAccount(followingId);

  var db = getDb();
  var inserted = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
      .insert(follows)
      .values({
        followerId: user.userId,
        followingId,
        status: targetIsPrivate ? "pending" : "accepted",
      })
      .onConflictDoNothing()
      .returning({ followerId: follows.followerId, status: follows.status });

    if (rows[0]?.status === "accepted") {
      await recordCounterDeltas(tx, followCounterDeltas({
        followerId: user.userId,
        followingId,
        delta: 1,
      }));
    }

    return rows;
  });
  if (inserted[0]?.status === "accepted") wakeCounterOutbox();

  // Backfill recent visible posts into the follower's materialized feed so
  // newly-followed accounts appear immediately without waiting for next post.
  var targetIsHighFollower = !targetIsPrivate && await isHighFollowerAccount(followingId);
  var recentPosts = targetIsPrivate || targetIsHighFollower
    ? []
    : await db
    .select({
      postId: posts.id,
      createdAt: posts.createdAt,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
    })
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
    var byPostId = new Map(
      recentPosts.map(function (row) {
        return [row.postId, row];
      })
    );

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
        var post = byPostId.get(postId);
        return {
          userId: user.userId,
          postId: postId,
          score: post
            ? computeFeedScore({
                createdAt: post.createdAt,
                likeCount: Number(post.likeCount ?? 0),
                commentCount: Number(post.commentCount ?? 0),
                repostCount: Number(post.repostCount ?? 0),
              })
            : null,
        };
      });

    if (missingFeedRows.length > 0) {
      await db
        .insert(feedItems)
        .values(missingFeedRows)
        .onConflictDoNothing({
          target: [feedItems.userId, feedItems.postId],
        });
    }
  }

  if (inserted[0]?.followerId) {
    void enqueueSuggestionRefresh(user.userId).catch(function (error) {
      console.error("[follows] failed to enqueue suggestion refresh", {
        userId: user.userId,
        error,
      });
    });
    await createNotification({
      recipientId: followingId,
      actorId: user.userId,
      type: targetIsPrivate ? "follow_request" : "follow",
      entityType: "user",
      entityId: user.userId,
    });
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

followRoutes.delete("/:userId", requireAuth, followWriteRateLimit, async function (c) {
  var user = c.get("user");
  var followingId = c.req.param("userId");

  if (followingId === user.userId) {
    throw badRequest("Cannot unfollow yourself");
  }

  await assertTargetExists(followingId);

  var db = getDb();
  var deleted = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
      .delete(follows)
      .where(and(eq(follows.followerId, user.userId), eq(follows.followingId, followingId)))
      .returning({ followerId: follows.followerId, status: follows.status });

    if (rows[0]?.status === "accepted") {
      await recordCounterDeltas(tx, followCounterDeltas({
        followerId: user.userId,
        followingId,
        delta: -1,
      }));
    }

    return rows;
  });
  if (deleted[0]?.status === "accepted") wakeCounterOutbox();

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

followRoutes.post("/:userId/accept", requireAuth, followWriteRateLimit, async function (c) {
  var user = c.get("user");
  var followerId = c.req.param("userId");

  if (followerId === user.userId) {
    throw badRequest("Cannot accept yourself");
  }

  await assertTargetExists(followerId);

  var db = getDb();
  var updated = await getWriteDb().transaction(async function (tx) {
    var rows = await tx
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

    if (rows.length > 0) {
      await recordCounterDeltas(tx, followCounterDeltas({
        followerId,
        followingId: user.userId,
        delta: 1,
      }));
    }

    return rows;
  });
  if (updated.length > 0) wakeCounterOutbox();

  if (updated.length > 0) {
    await createNotification({
      recipientId: followerId,
      actorId: user.userId,
      type: "follow_request_approved",
      entityType: "user",
      entityId: user.userId,
    });
    await invalidateViewerFeedCaches([followerId]);
    await invalidateAuthorProfileFeedCaches([user.userId]);
  }

  return c.json({ ok: true, accepted: updated.length > 0 });
});

followRoutes.get("/requests/received", requireAuth, async function (c) {
  var user = c.get("user");
  var limitRaw = Number(c.req.query("limit") ?? 20);
  var limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 50) : 20;
  var cursor = decodeCompositeCursor(c.req.query("cursor"));
  var db = getDb();

  var cursorFilter = cursor
    ? or(
        lt(follows.createdAt, cursor.createdAt),
        and(eq(follows.createdAt, cursor.createdAt), lt(follows.followerId, cursor.id))
      )
    : undefined;

  var rows = await db
    .select({
      requesterId: follows.followerId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      requestedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(profiles, eq(profiles.userId, follows.followerId))
    .where(
      and(
        eq(follows.followingId, user.userId),
        eq(follows.status, "pending"),
        cursorFilter
      )
    )
    .groupBy(
      follows.followerId,
      profiles.username,
      profiles.displayName,
      profiles.avatarUrl,
      profiles.avatarVariants,
      follows.createdAt
    )
    .orderBy(desc(follows.createdAt), desc(follows.followerId))
    .limit(limit + 1);

  var visibleRows = rows.slice(0, limit);
  var tail = visibleRows[visibleRows.length - 1];
  var hasMore = rows.length > limit;
  var mutualRequesterIds = visibleRows
    .slice(0, MAX_MUTUAL_FOLLOWER_COUNTS_PER_PAGE)
    .map(function (row) {
      return row.requesterId;
    });
  var mutualFollowerCounts = await mutualFollowerCountsForRequesters(
    user.userId,
    mutualRequesterIds
  );
  var total = hasMore ? visibleRows.length + 1 : visibleRows.length;

  return c.json({
    requests: await Promise.all(visibleRows.map(async function (row) {
      return {
        requesterId: row.requesterId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: await resolveProfileAvatarUrl(row.avatarUrl, row.requesterId, row.avatarVariants as AvatarVariants | null, "sm"),
        avatarUrlLg: await resolveProfileAvatarUrl(row.avatarUrl, row.requesterId, row.avatarVariants as AvatarVariants | null, "lg"),
        mutualFollowerCount: Number(mutualFollowerCounts.get(row.requesterId) ?? 0),
        requestedAt: row.requestedAt.toISOString(),
      };
    })),
    total,
    hasMore,
    nextCursor: rows.length > limit && tail
      ? encodeCompositeCursor({ createdAt: tail.requestedAt, id: tail.requesterId })
      : null,
  });
});

followRoutes.delete("/:userId/request", requireAuth, followWriteRateLimit, async function (c) {
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
