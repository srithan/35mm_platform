import { createDb, type Db } from "@35mm/db";
import { feedItems, follows, posts, profiles } from "@35mm/db/schema";
import { computeFeedScore } from "@35mm/types";
import { and, asc, eq, gt, or } from "drizzle-orm";
import { loadWorkerEnv } from "../lib/env.js";
import { invalidateViewerFeedCaches } from "../lib/feedCache.js";

export type FeedFanoutJobPayload = {
  postId: string;
  authorUserId: string;
};

export type FeedFanoutJobResult = {
  postId: string;
  authorUserId: string;
  followerCount: number;
  threshold: number;
  batchSize: number;
  inserted: number;
  invalidatedViewers: number;
  skipped: "post-not-found" | "private-or-deleted" | "high-follower" | null;
};

type FollowerCursor = {
  createdAt: Date;
  followerId: string;
};

var db: Db | null = null;

function getDb(): Db {
  if (!db) {
    db = createDb(loadWorkerEnv().DATABASE_URL);
  }
  return db;
}

function threshold(): number {
  var configured = Number(loadWorkerEnv().FEED_HIGH_FOLLOWER_THRESHOLD);
  if (!Number.isFinite(configured)) return 10_000;
  return Math.max(1, Math.floor(configured));
}

function batchSize(): number {
  var configured = Number(loadWorkerEnv().FEED_FANOUT_BATCH_SIZE);
  if (!Number.isFinite(configured)) return 500;
  return Math.max(1, Math.min(Math.floor(configured), 2_000));
}

function assertPayload(value: unknown): FeedFanoutJobPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid feed.fanout payload: object is required");
  }

  var payload = value as Partial<FeedFanoutJobPayload>;
  if (typeof payload.postId !== "string" || payload.postId.trim().length === 0) {
    throw new Error("Invalid feed.fanout payload: postId is required");
  }
  if (typeof payload.authorUserId !== "string" || payload.authorUserId.trim().length === 0) {
    throw new Error("Invalid feed.fanout payload: authorUserId is required");
  }

  return {
    postId: payload.postId,
    authorUserId: payload.authorUserId,
  };
}

async function authorFollowerCount(database: Db, authorUserId: string): Promise<number> {
  var rows = await database
    .select({
      followerCount: profiles.followerCount,
    })
    .from(profiles)
    .where(eq(profiles.userId, authorUserId))
    .limit(1);

  return Number(rows[0]?.followerCount ?? 0);
}

async function followerPage(database: Db, authorUserId: string, size: number, cursor: FollowerCursor | null) {
  var filters = [
    eq(follows.followingId, authorUserId),
    eq(follows.status, "accepted"),
  ];
  if (cursor) {
    filters.push(
      or(
        gt(follows.createdAt, cursor.createdAt),
        and(eq(follows.createdAt, cursor.createdAt), gt(follows.followerId, cursor.followerId))
      )!
    );
  }

  return database
    .select({
      followerId: follows.followerId,
      createdAt: follows.createdAt,
    })
    .from(follows)
    .where(and(...filters))
    .orderBy(asc(follows.createdAt), asc(follows.followerId))
    .limit(size);
}

export async function runFeedFanoutJob(payloadValue: unknown): Promise<FeedFanoutJobResult> {
  var payload = assertPayload(payloadValue);
  var database = getDb();
  var configuredThreshold = threshold();
  var configuredBatchSize = batchSize();

  var postRows = await database
    .select({
      id: posts.id,
      userId: posts.userId,
      visibility: posts.visibility,
      isDeleted: posts.isDeleted,
      createdAt: posts.createdAt,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
    })
    .from(posts)
    .where(eq(posts.id, payload.postId))
    .limit(1);

  var post = postRows[0];
  if (!post) {
    return {
      postId: payload.postId,
      authorUserId: payload.authorUserId,
      followerCount: 0,
      threshold: configuredThreshold,
      batchSize: configuredBatchSize,
      inserted: 0,
      invalidatedViewers: 0,
      skipped: "post-not-found",
    };
  }

  if (post.userId !== payload.authorUserId) {
    throw new Error("Invalid feed.fanout payload: authorUserId does not match post");
  }

  var followerCount = await authorFollowerCount(database, post.userId);
  var baseResult = {
    postId: post.id,
    authorUserId: post.userId,
    followerCount,
    threshold: configuredThreshold,
    batchSize: configuredBatchSize,
  };

  if (post.isDeleted || post.visibility === "private") {
    return {
      ...baseResult,
      inserted: 0,
      invalidatedViewers: 0,
      skipped: "private-or-deleted",
    };
  }

  if (followerCount >= configuredThreshold) {
    return {
      ...baseResult,
      inserted: 0,
      invalidatedViewers: 0,
      skipped: "high-follower",
    };
  }

  var cursor: FollowerCursor | null = null;
  var inserted = 0;
  var invalidatedViewers = 0;
  var score = computeFeedScore({
    createdAt: post.createdAt,
    likeCount: Number(post.likeCount ?? 0),
    commentCount: Number(post.commentCount ?? 0),
    repostCount: Number(post.repostCount ?? 0),
  });

  for (;;) {
    var followersPage = await followerPage(database, post.userId, configuredBatchSize, cursor);
    if (followersPage.length === 0) break;

    var insertRows = followersPage.map(function (row) {
      return {
        userId: row.followerId,
        postId: post.id,
        score,
      };
    });

    var insertedRows = await database
      .insert(feedItems)
      .values(insertRows)
      .onConflictDoNothing({
        target: [feedItems.userId, feedItems.postId],
      })
      .returning({ id: feedItems.id });

    inserted += insertedRows.length;
    invalidatedViewers += await invalidateViewerFeedCaches(
      followersPage.map(function (row) {
        return row.followerId;
      })
    );

    var tail = followersPage[followersPage.length - 1];
    cursor = {
      createdAt: tail.createdAt,
      followerId: tail.followerId,
    };
  }

  return {
    ...baseResult,
    inserted,
    invalidatedViewers,
    skipped: null,
  };
}
