import { createDb, type Db } from "@35mm/db";
import { feedItems } from "@35mm/db/schema";
import {
  feedItemsRetentionBoundary,
  parseFeedItemsRetentionDays,
} from "@35mm/types";
import { sql } from "drizzle-orm";
import { loadWorkerEnv } from "../lib/env.js";

export type FeedPruneFeedItemsJobPayload = {
  retentionDays?: number;
  batchSize?: number;
  maxBatches?: number;
};

export type FeedPruneFeedItemsJobResult = {
  retentionDays: number;
  cutoff: string;
  batchSize: number;
  maxBatches: number;
  batches: number;
  pruned: number;
  touchedViewers: number;
  invalidatedViewers: number;
};

var db: Db | null = null;

function getDb(): Db {
  if (!db) {
    db = createDb(loadWorkerEnv().DATABASE_URL);
  }
  return db;
}

function configuredBatchSize(payload: FeedPruneFeedItemsJobPayload): number {
  var configured = Number(payload.batchSize ?? loadWorkerEnv().FEED_ITEMS_PRUNE_BATCH_SIZE);
  if (!Number.isFinite(configured)) return 5_000;
  return Math.max(100, Math.min(Math.floor(configured), 20_000));
}

function configuredMaxBatches(payload: FeedPruneFeedItemsJobPayload): number {
  var configured = Number(payload.maxBatches ?? loadWorkerEnv().FEED_ITEMS_PRUNE_MAX_BATCHES);
  if (!Number.isFinite(configured)) return 20;
  return Math.max(1, Math.min(Math.floor(configured), 100));
}

function assertPayload(value: unknown): FeedPruneFeedItemsJobPayload {
  if (value == null) return {};
  if (typeof value !== "object") {
    throw new Error("Invalid feed.pruneFeedItems payload: object is required");
  }
  return value as FeedPruneFeedItemsJobPayload;
}

export async function runFeedPruneFeedItemsJob(
  payloadValue: unknown
): Promise<FeedPruneFeedItemsJobResult> {
  var payload = assertPayload(payloadValue);
  var retentionDays = parseFeedItemsRetentionDays(
    payload.retentionDays ?? loadWorkerEnv().FEED_ITEMS_RETENTION_DAYS
  );
  var cutoff = feedItemsRetentionBoundary(new Date(), retentionDays);
  var batchSize = configuredBatchSize(payload);
  var maxBatches = configuredMaxBatches(payload);
  var database = getDb();
  var pruned = 0;
  var touchedViewerIds = new Set<string>();
  var batches = 0;

  while (batches < maxBatches) {
    var deleteResult = await database.execute<{ user_id: string }>(sql`
      with doomed as (
        select ${feedItems.id} as id
        from ${feedItems}
        where ${feedItems.createdAt} < ${cutoff}
        order by ${feedItems.createdAt} asc, ${feedItems.id} asc
        limit ${batchSize}
        for update skip locked
      )
      delete from ${feedItems}
      using doomed
      where ${feedItems.id} = doomed.id
      returning ${feedItems.userId} as user_id
    `);

    var deleted = deleteResult.rows;
    if (deleted.length === 0) break;

    pruned += deleted.length;
    batches += 1;
    for (var row of deleted) {
      touchedViewerIds.add(row.user_id);
    }
  }

  var result = {
    retentionDays,
    cutoff: cutoff.toISOString(),
    batchSize,
    maxBatches,
    batches,
    pruned,
    touchedViewers: touchedViewerIds.size,
    invalidatedViewers: 0,
  };
  console.log("[feed.pruneFeedItems] pruned", result);
  return result;
}
