import { createDb, type Db } from "@35mm/db";
import { feedItems, posts } from "@35mm/db/schema";
import {
  computeFeedScore,
  feedItemsRetentionBoundary,
  parseFeedItemsRetentionDays,
} from "@35mm/types";
import { and, asc, eq, gt, gte, lte, or, sql } from "drizzle-orm";
import { loadWorkerEnv } from "../lib/env.js";
import { invalidateViewerFeedCaches } from "../lib/feedCache.js";

export type FeedRescoreJobPayload = {
  staleAfterMinutes?: number;
  maxAgeHours?: number;
  limit?: number;
};

export type FeedRescoreJobResult = {
  scanned: number;
  updated: number;
  invalidatedViewers: number;
  staleAfterMinutes: number;
  limit: number;
};

type FeedItemCursor = {
  scoreRefreshedAt: string;
  id: string;
};

var db: Db | null = null;

function getDb(): Db {
  if (!db) {
    db = createDb(loadWorkerEnv().DATABASE_URL);
  }
  return db;
}

function configuredStaleAfterMinutes(payload: FeedRescoreJobPayload): number {
  var configured = Number(payload.staleAfterMinutes ?? loadWorkerEnv().FEED_RESCORE_STALE_AFTER_MINUTES);
  if (!Number.isFinite(configured) && Number.isFinite(payload.maxAgeHours)) {
    configured = Number(payload.maxAgeHours) * 60;
  }
  if (!Number.isFinite(configured)) return 60;
  return Math.max(1, Math.min(Math.floor(configured), 24 * 60));
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
    sql`${feedItems.scoreRefreshedAt} > ${cursor.scoreRefreshedAt}::timestamptz`,
    and(
      sql`${feedItems.scoreRefreshedAt} = ${cursor.scoreRefreshedAt}::timestamptz`,
      gt(feedItems.id, cursor.id)
    )
  );
}

export async function runFeedRescoreJob(payloadValue: unknown): Promise<FeedRescoreJobResult> {
  var payload = assertPayload(payloadValue);
  var database = getDb();
  var staleAfterMinutes = configuredStaleAfterMinutes(payload);
  var batchSize = configuredBatchSize();
  var limit = configuredLimit(payload);
  var staleCutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000);
  var retentionDays = parseFeedItemsRetentionDays(loadWorkerEnv().FEED_ITEMS_RETENTION_DAYS);
  var retentionCutoff = feedItemsRetentionBoundary(new Date(), retentionDays);

  var cursor: FeedItemCursor | null = null;
  var scanned = 0;
  var updated = 0;
  var invalidatedViewers = 0;

  while (scanned < limit) {
    var remaining = limit - scanned;
    var filters = [
      gte(feedItems.createdAt, retentionCutoff),
      lte(feedItems.scoreRefreshedAt, staleCutoff),
      eq(posts.isDeleted, false),
    ];
    var cursorFilter = feedItemCursorFilter(cursor);
    if (cursorFilter) filters.push(cursorFilter);

    var rows = await database
      .select({
        id: feedItems.id,
        userId: feedItems.userId,
        scoreRefreshedAtCursor: sql<string>`${feedItems.scoreRefreshedAt}::text`,
        postCreatedAt: posts.createdAt,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        repostCount: posts.repostCount,
      })
      .from(feedItems)
      .innerJoin(posts, eq(posts.id, feedItems.postId))
      .where(and(...filters))
      .orderBy(asc(feedItems.scoreRefreshedAt), asc(feedItems.id))
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
        .set({ score, scoreRefreshedAt: new Date() })
        .where(eq(feedItems.id, row.id));
      touchedViewers.add(row.userId);
      updated += 1;
    }

    invalidatedViewers += await invalidateViewerFeedCaches(Array.from(touchedViewers));
    scanned += rows.length;

    var tail = rows[rows.length - 1];
    cursor = {
      scoreRefreshedAt: tail.scoreRefreshedAtCursor,
      id: tail.id,
    };
  }

  return {
    scanned,
    updated,
    invalidatedViewers,
    staleAfterMinutes,
    limit,
  };
}
