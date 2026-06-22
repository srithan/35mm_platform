import { createDb, type Db } from "@35mm/db";
import { feedItems, posts } from "@35mm/db/schema";
import {
  computeFeedScore,
  feedItemsRetentionBoundary,
  parseFeedItemsRetentionDays,
} from "@35mm/types";
import { and, asc, eq, gt, gte, or } from "drizzle-orm";
import { loadWorkerEnv } from "../lib/env.js";
import { invalidateViewerFeedCaches } from "../lib/feedCache.js";

export type FeedRescoreJobPayload = {
  maxAgeHours?: number;
  limit?: number;
};

export type FeedRescoreJobResult = {
  scanned: number;
  updated: number;
  invalidatedViewers: number;
  maxAgeHours: number;
  limit: number;
};

type FeedItemCursor = {
  createdAt: Date;
  id: string;
};

var db: Db | null = null;

function getDb(): Db {
  if (!db) {
    db = createDb(loadWorkerEnv().DATABASE_URL);
  }
  return db;
}

function configuredMaxAgeHours(payload: FeedRescoreJobPayload): number {
  var configured = Number(payload.maxAgeHours ?? loadWorkerEnv().FEED_RESCORE_MAX_AGE_HOURS);
  if (!Number.isFinite(configured)) return 72;
  return Math.max(1, Math.min(Math.floor(configured), 24 * 14));
}

function configuredBatchSize(): number {
  var configured = Number(loadWorkerEnv().FEED_RESCORE_BATCH_SIZE);
  if (!Number.isFinite(configured)) return 500;
  return Math.max(1, Math.min(Math.floor(configured), 2_000));
}

function configuredLimit(payload: FeedRescoreJobPayload): number {
  var configured = Number(payload.limit ?? configuredBatchSize() * 20);
  if (!Number.isFinite(configured)) return configuredBatchSize() * 20;
  return Math.max(1, Math.min(Math.floor(configured), 100_000));
}

function assertPayload(value: unknown): FeedRescoreJobPayload {
  if (value == null) return {};
  if (typeof value !== "object") {
    throw new Error("Invalid feed.rescore payload: object is required");
  }
  return value as FeedRescoreJobPayload;
}

function feedItemCursorFilter(cursor: FeedItemCursor | null) {
  if (!cursor) return undefined;
  return or(
    gt(feedItems.createdAt, cursor.createdAt),
    and(eq(feedItems.createdAt, cursor.createdAt), gt(feedItems.id, cursor.id))
  );
}

export async function runFeedRescoreJob(payloadValue: unknown): Promise<FeedRescoreJobResult> {
  var payload = assertPayload(payloadValue);
  var database = getDb();
  var maxAgeHours = configuredMaxAgeHours(payload);
  var batchSize = configuredBatchSize();
  var limit = configuredLimit(payload);
  var rescoreCutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
  var retentionDays = parseFeedItemsRetentionDays(loadWorkerEnv().FEED_ITEMS_RETENTION_DAYS);
  var retentionCutoff = feedItemsRetentionBoundary(new Date(), retentionDays);
  var cutoff = new Date(Math.max(rescoreCutoff.getTime(), retentionCutoff.getTime()));

  var cursor: FeedItemCursor | null = null;
  var scanned = 0;
  var updated = 0;
  var invalidatedViewers = 0;

  while (scanned < limit) {
    var remaining = limit - scanned;
    var filters = [
      gte(feedItems.createdAt, cutoff),
      eq(posts.isDeleted, false),
    ];
    var cursorFilter = feedItemCursorFilter(cursor);
    if (cursorFilter) filters.push(cursorFilter);

    var rows = await database
      .select({
        id: feedItems.id,
        userId: feedItems.userId,
        createdAt: feedItems.createdAt,
        postCreatedAt: posts.createdAt,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        repostCount: posts.repostCount,
      })
      .from(feedItems)
      .innerJoin(posts, eq(posts.id, feedItems.postId))
      .where(and(...filters))
      .orderBy(asc(feedItems.createdAt), asc(feedItems.id))
      .limit(Math.min(batchSize, remaining));

    if (rows.length === 0) break;

    var touchedViewers = new Set<string>();
    for (var row of rows) {
      var score = computeFeedScore({
        createdAt: row.postCreatedAt,
        likeCount: Number(row.likeCount ?? 0),
        commentCount: Number(row.commentCount ?? 0),
        repostCount: Number(row.repostCount ?? 0),
      });

      await database
        .update(feedItems)
        .set({ score })
        .where(eq(feedItems.id, row.id));
      touchedViewers.add(row.userId);
      updated += 1;
    }

    invalidatedViewers += await invalidateViewerFeedCaches(Array.from(touchedViewers));
    scanned += rows.length;

    var tail = rows[rows.length - 1];
    cursor = {
      createdAt: tail.createdAt,
      id: tail.id,
    };
  }

  return {
    scanned,
    updated,
    invalidatedViewers,
    maxAgeHours,
    limit,
  };
}
