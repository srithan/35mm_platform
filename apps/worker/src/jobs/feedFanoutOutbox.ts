import { createPooledDb, type PooledDb } from "@35mm/db";
import { feedFanoutOutbox } from "@35mm/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import type { Queue } from "bullmq";
import { loadWorkerEnv } from "../lib/env.js";

type FeedFanoutOutboxPayload = {
  limit?: number;
};

export type FeedFanoutOutboxRow = {
  id: string;
  post_id: string;
  author_user_id: string;
  attempts: number;
};

export type FeedFanoutOutboxResult = {
  claimed: number;
  enqueued: number;
  failed: number;
  backlog: number;
  followUp: boolean;
};

var writeDb: PooledDb | null = null;

function getWriteDb(): PooledDb {
  if (!writeDb) {
    writeDb = createPooledDb(loadWorkerEnv().DATABASE_URL);
  }
  return writeDb;
}

function rowsOf<T>(result: unknown): T[] {
  if (!result || typeof result !== "object" || !("rows" in result)) return [];
  var rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? rows as T[] : [];
}

function batchLimit(): number {
  var configured = Number(process.env.FEED_FANOUT_OUTBOX_BATCH_SIZE ?? "100");
  if (!Number.isFinite(configured)) return 100;
  return Math.max(1, Math.min(Math.floor(configured), 500));
}

export function feedFanoutOutboxRetryDelayMs(attempts: number): number {
  var base = Number(process.env.FEED_FANOUT_OUTBOX_RETRY_BASE_MS ?? "5000");
  var max = Number(process.env.FEED_FANOUT_OUTBOX_RETRY_MAX_MS ?? "300000");
  var safeBase = Number.isFinite(base) ? Math.max(1_000, Math.floor(base)) : 5_000;
  var safeMax = Number.isFinite(max) ? Math.max(safeBase, Math.floor(max)) : 300_000;
  return Math.min(safeMax, safeBase * Math.pow(2, Math.max(0, attempts - 1)));
}

export function buildFeedFanoutRecoveryJobs(rows: FeedFanoutOutboxRow[]) {
  return rows.map(function (row) {
    return {
      name: "feed.fanout",
      data: {
        postId: row.post_id,
        authorUserId: row.author_user_id,
      },
      opts: {
        jobId: "feed.fanout-outbox-" + row.id + "-" + row.attempts,
        attempts: 8,
        backoff: { type: "exponential" as const, delay: 2_000 },
        removeOnComplete: true,
        removeOnFail: 1000,
      },
    };
  });
}

function nextAttemptAt(delayMs: number): Date {
  return new Date(Date.now() + delayMs);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 1000);
  return String(error).slice(0, 1000);
}

function assertPayload(value: unknown): FeedFanoutOutboxPayload {
  if (value == null) return {};
  if (typeof value !== "object") {
    throw new Error("Invalid feed.fanout.outbox payload: object is required");
  }
  var payload = value as FeedFanoutOutboxPayload;
  if (payload.limit !== undefined && (!Number.isInteger(payload.limit) || payload.limit <= 0)) {
    throw new Error("Invalid feed.fanout.outbox payload: limit must be a positive integer");
  }
  return payload;
}

async function claimRows(database: PooledDb, limit: number): Promise<FeedFanoutOutboxRow[]> {
  return database.transaction(async function (tx) {
    var result = await tx.execute(sql`
      update ${feedFanoutOutbox}
      set
        status = 'processing',
        attempts = ${feedFanoutOutbox.attempts} + 1,
        locked_at = now(),
        updated_at = now()
      where ${feedFanoutOutbox.id} in (
        select ${feedFanoutOutbox.id}
        from ${feedFanoutOutbox}
        where
          (
            ${feedFanoutOutbox.status} = 'pending'
            and ${feedFanoutOutbox.nextAttemptAt} <= now()
          )
          or (
            ${feedFanoutOutbox.status} = 'processing'
            and ${feedFanoutOutbox.lockedAt} < now() - interval '5 minutes'
          )
        order by
          ${feedFanoutOutbox.nextAttemptAt},
          ${feedFanoutOutbox.createdAt},
          ${feedFanoutOutbox.id}
        limit ${limit}
        for update skip locked
      )
      returning
        ${feedFanoutOutbox.id} as id,
        ${feedFanoutOutbox.postId} as post_id,
        ${feedFanoutOutbox.authorUserId} as author_user_id,
        ${feedFanoutOutbox.attempts} as attempts
    `);
    return rowsOf<FeedFanoutOutboxRow>(result);
  });
}

async function pendingBacklog(database: PooledDb): Promise<number> {
  var result = await database.execute(sql`
    select count(*)::bigint as backlog
    from ${feedFanoutOutbox}
    where
      (
        ${feedFanoutOutbox.status} = 'pending'
        and ${feedFanoutOutbox.nextAttemptAt} <= now()
      )
      or (
        ${feedFanoutOutbox.status} = 'processing'
        and ${feedFanoutOutbox.lockedAt} < now() - interval '5 minutes'
      )
  `);
  var rows = rowsOf<{ backlog: string | number }>(result);
  return Math.max(0, Number(rows[0]?.backlog ?? 0));
}

export async function completeFeedFanoutOutbox(postId: string): Promise<void> {
  await getWriteDb()
    .delete(feedFanoutOutbox)
    .where(eq(feedFanoutOutbox.postId, postId));
}

export async function runFeedFanoutOutboxJob(
  payloadValue: unknown,
  queue: Queue
): Promise<FeedFanoutOutboxResult> {
  var payload = assertPayload(payloadValue);
  var limit = payload.limit == null
    ? batchLimit()
    : Math.max(1, Math.min(Math.floor(payload.limit), 500));
  var database = getWriteDb();
  var rows = await claimRows(database, limit);
  if (rows.length === 0) {
    return { claimed: 0, enqueued: 0, failed: 0, backlog: 0, followUp: false };
  }

  var rowIds = rows.map(function (row) { return row.id; });
  var enqueued = 0;
  var failed = 0;

  try {
    await queue.addBulk(buildFeedFanoutRecoveryJobs(rows));

    await database
      .update(feedFanoutOutbox)
      .set({
        status: "pending",
        lockedAt: null,
        nextAttemptAt: nextAttemptAt(300_000),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(inArray(feedFanoutOutbox.id, rowIds));
    enqueued = rows.length;
  } catch (error) {
    var maxAttempts = rows.reduce(function (max, row) {
      return Math.max(max, row.attempts);
    }, 1);
    await database
      .update(feedFanoutOutbox)
      .set({
        status: "pending",
        lockedAt: null,
        nextAttemptAt: nextAttemptAt(feedFanoutOutboxRetryDelayMs(maxAttempts)),
        lastError: errorMessage(error),
        updatedAt: new Date(),
      })
      .where(inArray(feedFanoutOutbox.id, rowIds));
    failed = rows.length;
  }

  var backlog = await pendingBacklog(database);
  return {
    claimed: rows.length,
    enqueued,
    failed,
    backlog,
    followUp: rows.length === limit && backlog > 0,
  };
}
