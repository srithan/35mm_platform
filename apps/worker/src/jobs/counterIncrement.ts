import { createDb, createPooledDb, type Db, type PooledDb } from "@35mm/db";
import {
  comments,
  counterJobs,
  counterJobDeltas,
  filmLists,
  profileFollowApprovalOutbox,
  pollOptions,
  postPolls,
  posts,
  profiles,
} from "@35mm/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Queue } from "bullmq";
import { loadWorkerEnv } from "../lib/env.js";
import { runProfileFollowApprovalJob } from "./profileFollowApproval.js";

export type CounterTargetTable =
  | "posts"
  | "comments"
  | "post_polls"
  | "poll_options"
  | "film_lists"
  | "profiles";

export type CounterName =
  | "likeCount"
  | "commentCount"
  | "repostCount"
  | "bookmarkCount"
  | "totalVotes"
  | "voteCount"
  | "entryCount"
  | "filmsLoggedCount"
  | "postCount"
  | "followerCount"
  | "followingCount";

export type CounterIncrementJobPayload = {
  targetTable: CounterTargetTable;
  targetId: string;
  counterName: CounterName;
  delta: number;
};

type PendingCounter = {
  payload: CounterIncrementJobPayload;
  delta: number;
  resolve: Array<(value: unknown) => void>;
  reject: Array<(reason?: unknown) => void>;
};

var db: Db | null = null;
var writeDb: PooledDb | null = null;
var pendingCounters = new Map<string, PendingCounter>();
var flushTimer: NodeJS.Timeout | null = null;

function getDb(): Db {
  if (!db) {
    db = createDb(loadWorkerEnv().DATABASE_URL);
  }
  return db;
}

function getWriteDb(): PooledDb {
  if (!writeDb) {
    writeDb = createPooledDb(loadWorkerEnv().DATABASE_URL);
  }
  return writeDb;
}

function batchWindowMs(): number {
  var configured = Number(process.env.COUNTER_BATCH_WINDOW_MS ?? "50");
  if (!Number.isFinite(configured)) return 50;
  return Math.max(0, Math.min(configured, 1000));
}

function keyFor(payload: CounterIncrementJobPayload): string {
  return `${payload.targetTable}:${payload.counterName}:${payload.targetId}`;
}

function assertPayload(value: unknown): CounterIncrementJobPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid counter.increment payload: object is required");
  }

  var payload = value as Partial<CounterIncrementJobPayload>;
  if (typeof payload.targetTable !== "string" || payload.targetTable.length === 0) {
    throw new Error("Invalid counter.increment payload: targetTable is required");
  }
  if (typeof payload.targetId !== "string" || payload.targetId.length === 0) {
    throw new Error("Invalid counter.increment payload: targetId is required");
  }
  if (typeof payload.counterName !== "string" || payload.counterName.length === 0) {
    throw new Error("Invalid counter.increment payload: counterName is required");
  }
  if (!Number.isInteger(payload.delta) || payload.delta === 0) {
    throw new Error("Invalid counter.increment payload: delta must be a non-zero integer");
  }

  var normalized = payload as CounterIncrementJobPayload;
  assertSupportedCounter(normalized);
  return normalized;
}

function assertSupportedCounter(payload: CounterIncrementJobPayload): void {
  var allowed: Record<CounterTargetTable, CounterName[]> = {
    posts: ["likeCount", "commentCount", "repostCount", "bookmarkCount"],
    comments: ["likeCount"],
    post_polls: ["totalVotes"],
    poll_options: ["voteCount"],
    film_lists: ["likeCount", "commentCount", "entryCount"],
    profiles: ["filmsLoggedCount", "postCount", "followerCount", "followingCount"],
  };

  if (!allowed[payload.targetTable]?.includes(payload.counterName)) {
    throw new Error(
      "Unsupported counter.increment target: " +
        payload.targetTable +
        "." +
        payload.counterName
    );
  }
}

function positiveDelta(column: unknown, delta: number) {
  return sql`greatest(${column} + ${delta}, 0)`;
}

async function applyCounterDelta(
  database: any,
  payload: CounterIncrementJobPayload,
  delta: number
): Promise<unknown> {
  var now = new Date();

  if (payload.targetTable === "posts") {
    if (payload.counterName === "likeCount") {
      return database.update(posts).set({ likeCount: positiveDelta(posts.likeCount, delta), updatedAt: now }).where(eq(posts.id, payload.targetId));
    }
    if (payload.counterName === "commentCount") {
      return database.update(posts).set({ commentCount: positiveDelta(posts.commentCount, delta), updatedAt: now }).where(eq(posts.id, payload.targetId));
    }
    if (payload.counterName === "repostCount") {
      return database.update(posts).set({ repostCount: positiveDelta(posts.repostCount, delta), updatedAt: now }).where(eq(posts.id, payload.targetId));
    }
    if (payload.counterName === "bookmarkCount") {
      return database.update(posts).set({ bookmarkCount: positiveDelta(posts.bookmarkCount, delta), updatedAt: now }).where(eq(posts.id, payload.targetId));
    }
  }

  if (payload.targetTable === "comments" && payload.counterName === "likeCount") {
    return database.update(comments).set({ likeCount: positiveDelta(comments.likeCount, delta), updatedAt: now }).where(eq(comments.id, payload.targetId));
  }

  if (payload.targetTable === "post_polls" && payload.counterName === "totalVotes") {
    return database.update(postPolls).set({ totalVotes: positiveDelta(postPolls.totalVotes, delta), updatedAt: now }).where(eq(postPolls.id, payload.targetId));
  }

  if (payload.targetTable === "poll_options" && payload.counterName === "voteCount") {
    return database.update(pollOptions).set({ voteCount: positiveDelta(pollOptions.voteCount, delta) }).where(eq(pollOptions.id, payload.targetId));
  }

  if (payload.targetTable === "film_lists") {
    if (payload.counterName === "likeCount") {
      return database.update(filmLists).set({ likeCount: positiveDelta(filmLists.likeCount, delta), updatedAt: now }).where(eq(filmLists.id, payload.targetId));
    }
    if (payload.counterName === "commentCount") {
      return database.update(filmLists).set({ commentCount: positiveDelta(filmLists.commentCount, delta), updatedAt: now }).where(eq(filmLists.id, payload.targetId));
    }
    if (payload.counterName === "entryCount") {
      return database.update(filmLists).set({ entryCount: positiveDelta(filmLists.entryCount, delta), updatedAt: now }).where(eq(filmLists.id, payload.targetId));
    }
  }

  if (payload.targetTable === "profiles" && payload.counterName === "filmsLoggedCount") {
    return database.update(profiles).set({ filmsLoggedCount: positiveDelta(profiles.filmsLoggedCount, delta), updatedAt: now }).where(eq(profiles.userId, payload.targetId));
  }

  if (payload.targetTable === "profiles" && payload.counterName === "postCount") {
    return database.update(profiles).set({ postCount: positiveDelta(profiles.postCount, delta), updatedAt: now }).where(eq(profiles.userId, payload.targetId));
  }

  if (payload.targetTable === "profiles" && payload.counterName === "followerCount") {
    return database.update(profiles).set({ followerCount: positiveDelta(profiles.followerCount, delta), updatedAt: now }).where(eq(profiles.userId, payload.targetId));
  }

  if (payload.targetTable === "profiles" && payload.counterName === "followingCount") {
    return database.update(profiles).set({ followingCount: positiveDelta(profiles.followingCount, delta), updatedAt: now }).where(eq(profiles.userId, payload.targetId));
  }

  throw new Error(
    "Unsupported counter.increment target: " +
      payload.targetTable +
      "." +
      payload.counterName
  );
}

type CounterJobRow = {
  id: string;
  target_table: CounterTargetTable;
  target_id: string;
  counter_name: CounterName;
  delta: number;
};

type CounterOutboxPayload = {
  limit?: number;
  timeBudgetMs?: number;
};

type CounterOutboxBatchResult = {
  claimed: number;
  applied: number;
};

type CounterFollowApprovalOutboxRow = {
  id: string;
  target_user_id: string;
  cursor: string | null;
  attempts: number;
  status: string;
  next_attempt_at: Date;
};

type CounterFollowApprovalOutboxBatchResult = {
  claimed: number;
  progressed: number;
  completed: number;
};

export type CounterOutboxJobResult = {
  ok: true;
  claimed: number;
  applied: number;
  loops: number;
  limit: number;
  timeBudgetMs: number;
  elapsedMs: number;
  backlog: number;
  timedOut: boolean;
  followUp: boolean;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function counterOutboxBatchLimit(): number {
  var configured = Number(process.env.COUNTER_OUTBOX_BATCH_SIZE ?? "500");
  if (!Number.isFinite(configured)) return 500;
  return Math.max(1, Math.min(Math.floor(configured), 5000));
}

function counterDoneRetentionDays(): number {
  var configured = Number(process.env.COUNTER_DONE_ROW_RETENTION_DAYS ?? "7");
  if (!Number.isFinite(configured)) return 7;
  return Math.max(0, Math.floor(configured));
}

function counterOutboxLoopBudgetMs(): number {
  var configured = Number(process.env.COUNTER_OUTBOX_LOOP_BUDGET_MS ?? "750");
  if (!Number.isFinite(configured)) return 750;
  return Math.max(150, Math.min(Math.floor(configured), 10_000));
}

async function pruneDoneCounterJobs(database: any): Promise<void> {
  var retentionDays = counterDoneRetentionDays();
  if (retentionDays === 0) return;

  await database.execute(sql`
    delete from ${counterJobs}
    where
      ${counterJobs.status} = 'done'
      and ${counterJobs.processedAt} is not null
      and ${counterJobs.processedAt} < now() - make_interval(days := ${retentionDays})
  `);
}

async function releaseCounterJobDeltas(
  database: any,
  payloads: CounterIncrementJobPayload[]
): Promise<void> {
  if (payloads.length === 0) return;

  var now = new Date();
  for (var payload of payloads) {
    if (payload.delta === 0) continue;
    await database
      .update(counterJobDeltas)
      .set({
        delta: sql`${counterJobDeltas.delta} - ${payload.delta}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(counterJobDeltas.targetTable, payload.targetTable),
          eq(counterJobDeltas.targetId, payload.targetId),
          eq(counterJobDeltas.counterName, payload.counterName)
        )
      );
  }

  await database.delete(counterJobDeltas).where(eq(counterJobDeltas.delta, 0));
}

function assertCounterOutboxPayload(value: unknown): CounterOutboxPayload {
  if (value == null) return {};
  if (typeof value !== "object") {
    throw new Error("Invalid counter.outbox payload: object is required");
  }

  var input = value as Partial<CounterOutboxPayload>;
  var limit = input.limit;
  var timeBudgetMs = input.timeBudgetMs;

  if (limit !== undefined) {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new Error("Invalid counter.outbox payload: limit must be a positive integer");
    }
  }

  if (timeBudgetMs !== undefined) {
    if (!Number.isInteger(timeBudgetMs) || timeBudgetMs <= 0) {
      throw new Error(
        "Invalid counter.outbox payload: timeBudgetMs must be a positive integer"
      );
    }
  }

  return input;
}

function errorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);

  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unknown profile follow-approval outbox error";
}

function followApprovalOutboxMaxAttempts(): number {
  var configured = Number(process.env.PROFILE_FOLLOW_APPROVAL_OUTBOX_MAX_ATTEMPTS ?? "12");
  if (!Number.isFinite(configured)) return 12;
  return Math.max(1, Math.floor(configured));
}

function followApprovalOutboxBaseDelayMs(): number {
  var configured = Number(process.env.PROFILE_FOLLOW_APPROVAL_OUTBOX_BASE_DELAY_MS ?? "1000");
  if (!Number.isFinite(configured)) return 1_000;
  return Math.max(200, Math.floor(configured));
}

function followApprovalOutboxMaxDelayMs(): number {
  var configured = Number(process.env.PROFILE_FOLLOW_APPROVAL_OUTBOX_MAX_DELAY_MS ?? "60000");
  if (!Number.isFinite(configured)) return 60_000;
  return Math.max(1_000, Math.floor(configured));
}

function followApprovalOutboxRetryDelayMs(attempts: number): number {
  var base = followApprovalOutboxBaseDelayMs();
  var max = followApprovalOutboxMaxDelayMs();
  var factor = Math.pow(2, Math.max(0, attempts - 1));
  var delay = base * factor;
  return Math.max(base, Math.min(Math.max(base, delay), max));
}

function followApprovalOutboxBackoffAt(attempts: number): Date {
  return new Date(Date.now() + followApprovalOutboxRetryDelayMs(Math.max(1, attempts)));
}

async function pendingCounterOutboxBacklog(database: any): Promise<number> {
  var result = await database.execute(sql`
    select count(*)::bigint as backlog
    from ${counterJobs}
    where
      ${counterJobs.status} = 'pending'
      or (
        ${counterJobs.status} = 'processing'
        and ${counterJobs.lockedAt} < now() - interval '5 minutes'
      )
  `);
  var rows = rowsOf<{ backlog: string | number }>(result);
  if (rows.length === 0) return 0;
  return Math.max(0, Number(rows[0].backlog ?? 0));
}

async function pendingProfileFollowApprovalOutboxBacklog(database: any): Promise<number> {
  var result = await database.execute(sql`
    select count(*)::bigint as backlog
    from ${profileFollowApprovalOutbox}
    where
      (
        ${profileFollowApprovalOutbox.status} = 'pending'
        and ${profileFollowApprovalOutbox.nextAttemptAt} <= now()
      )
      or (
        ${profileFollowApprovalOutbox.status} = 'processing'
        and ${profileFollowApprovalOutbox.lockedAt} < now() - interval '5 minutes'
      )
  `);
  var rows = rowsOf<{ backlog: string | number }>(result);
  if (rows.length === 0) return 0;
  return Math.max(0, Number(rows[0].backlog ?? 0));
}

async function drainOneOutboxBatch(
  database: any,
  limit: number
): Promise<CounterOutboxBatchResult> {
  var claimedResult = await database.execute(sql`
    update ${counterJobs}
    set
      status = 'processing',
      attempts = ${counterJobs.attempts} + 1,
      locked_at = now(),
      updated_at = now()
    where ${counterJobs.id} in (
      select ${counterJobs.id}
      from ${counterJobs}
      where
        ${counterJobs.status} = 'pending'
        or (
          ${counterJobs.status} = 'processing'
          and ${counterJobs.lockedAt} < now() - interval '5 minutes'
        )
      order by ${counterJobs.createdAt}, ${counterJobs.id}
      limit ${limit}
      for update skip locked
    )
    returning
      ${counterJobs.id} as id,
      ${counterJobs.targetTable} as target_table,
      ${counterJobs.targetId} as target_id,
      ${counterJobs.counterName} as counter_name,
      ${counterJobs.delta} as delta
  `);

  var rows = rowsOf<CounterJobRow>(claimedResult);
  if (rows.length === 0) {
    return { claimed: 0, applied: 0 };
  }

  var byKey = new Map<string, CounterIncrementJobPayload>();
  for (var row of rows) {
    var key = `${row.target_table}:${row.counter_name}:${row.target_id}`;
    var existing = byKey.get(key);
    if (existing) {
      existing.delta += Number(row.delta);
    } else {
      byKey.set(key, {
        targetTable: row.target_table,
        targetId: row.target_id,
        counterName: row.counter_name,
        delta: Number(row.delta),
      });
    }
  }

  var applied = 0;
  var payloads = Array.from(byKey.values());
  for (var payload of payloads) {
    if (payload.delta === 0) continue;
    assertPayload(payload);
    await applyCounterDelta(database, payload, payload.delta);
    applied += 1;
  }

  await releaseCounterJobDeltas(database, payloads);

  await database
    .delete(counterJobs)
    .where(inArray(counterJobs.id, rows.map(function (row) { return row.id; })));

  return { claimed: rows.length, applied };
}

async function drainProfileFollowApprovalOutboxBatch(
  database: any,
  limit: number,
  queue: Queue
): Promise<CounterFollowApprovalOutboxBatchResult> {
  var maxAttempts = followApprovalOutboxMaxAttempts();
  var claimedResult = await database.execute(sql`
    update ${profileFollowApprovalOutbox}
    set
      status = 'processing',
      attempts = ${profileFollowApprovalOutbox.attempts} + 1,
      locked_at = now(),
      updated_at = now()
    where ${profileFollowApprovalOutbox.id} in (
      select ${profileFollowApprovalOutbox.id}
      from ${profileFollowApprovalOutbox}
      where
        (
          ${profileFollowApprovalOutbox.status} = 'pending'
          and ${profileFollowApprovalOutbox.nextAttemptAt} <= now()
        )
        or (
          ${profileFollowApprovalOutbox.status} = 'processing'
          and ${profileFollowApprovalOutbox.lockedAt} < now() - interval '5 minutes'
        )
      order by ${profileFollowApprovalOutbox.nextAttemptAt}, ${profileFollowApprovalOutbox.createdAt}, ${profileFollowApprovalOutbox.id}
      limit ${limit}
      for update skip locked
    )
    returning
      ${profileFollowApprovalOutbox.id} as id,
      ${profileFollowApprovalOutbox.targetUserId} as target_user_id,
      ${profileFollowApprovalOutbox.cursor} as cursor,
      ${profileFollowApprovalOutbox.attempts} as attempts,
      ${profileFollowApprovalOutbox.status} as status,
      ${profileFollowApprovalOutbox.nextAttemptAt} as next_attempt_at
  `);

  var rows = rowsOf<CounterFollowApprovalOutboxRow>(claimedResult);
  if (rows.length === 0) return { claimed: 0, completed: 0, progressed: 0 };

  var completed = 0;
  var progressed = 0;

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    if (!row) continue;

    try {
      var followResult = await runProfileFollowApprovalJob(
        {
          targetUserId: row.target_user_id,
          cursor: row.cursor,
        },
        queue,
        { enqueueCursorJobs: false }
      );

      if (followResult.hasMore && followResult.nextCursor) {
        await database
          .update(profileFollowApprovalOutbox)
          .set({
            cursor: followResult.nextCursor,
            status: "pending",
            lockedAt: null,
            nextAttemptAt: new Date(),
            attempts: row.attempts,
            lastError: null,
            updatedAt: new Date(),
          })
          .where(eq(profileFollowApprovalOutbox.id, row.id));
        progressed += 1;
      } else {
        await database
          .delete(profileFollowApprovalOutbox)
          .where(eq(profileFollowApprovalOutbox.id, row.id));
        completed += 1;
      }
    } catch (_error) {
      var attempts = row.attempts;
      var shouldRetry = attempts <= maxAttempts;
      var nextAttemptAt = shouldRetry
        ? followApprovalOutboxBackoffAt(attempts)
        : followApprovalOutboxBackoffAt(maxAttempts);

      await database
        .update(profileFollowApprovalOutbox)
        .set({
          status: "pending",
          lockedAt: null,
          nextAttemptAt,
          attempts: attempts,
          lastError: attempts > maxAttempts
            ? "Profile follow-approval outbox exceeded max retry attempts; continuing with throttled retry"
            : errorMessage(_error).slice(0, 1000),
          updatedAt: new Date(),
        })
        .where(eq(profileFollowApprovalOutbox.id, row.id));
      progressed += 1;
    }
  }

  return { claimed: rows.length, completed, progressed };
}

export async function runCounterOutboxJob(data: unknown, queue: Queue): Promise<CounterOutboxJobResult> {
  var input = assertCounterOutboxPayload(data);
  var limit = typeof input.limit === "number"
    ? Math.max(1, Math.min(Math.floor(input.limit), 5000))
    : counterOutboxBatchLimit();
  var timeBudgetMs = typeof input.timeBudgetMs === "number"
    ? Math.max(150, Math.min(Math.floor(input.timeBudgetMs), 10_000))
    : counterOutboxLoopBudgetMs();

  var database = getWriteDb();
  await database.transaction(async function (tx) {
    await pruneDoneCounterJobs(tx);
  });

  var startTime = Date.now();
  var deadline = startTime + timeBudgetMs;
  var claimed = 0;
  var applied = 0;
  var loops = 0;
  var lastBatch = 0;

  while (Date.now() < deadline) {
    var batch = await database.transaction(async function (tx) {
      return drainOneOutboxBatch(tx, limit);
    });
    var followApprovalBatch = await database.transaction(async function (tx) {
      return drainProfileFollowApprovalOutboxBatch(tx, limit, queue);
    });

    loops += 1;
    claimed += batch.claimed;
    applied += batch.applied;
    lastBatch = Math.max(batch.claimed, followApprovalBatch.claimed);

    if (batch.claimed === 0 && followApprovalBatch.claimed === 0) {
      break;
    }

    if ((batch.claimed === 0 && followApprovalBatch.claimed === 0) || (batch.claimed < limit && followApprovalBatch.claimed < limit)) {
      break;
    }
  }

  var counterBacklog = await pendingCounterOutboxBacklog(database);
  var followApprovalBacklog = await pendingProfileFollowApprovalOutboxBacklog(database);
  var backlog = counterBacklog + followApprovalBacklog;
  var elapsedMs = Date.now() - startTime;
  var timedOut = Date.now() >= deadline;
  var followUp = (lastBatch === limit && backlog > 0);

  return {
    ok: true,
    claimed,
    applied,
    loops,
    limit,
    timeBudgetMs,
    elapsedMs,
    backlog,
    timedOut,
    followUp,
  };
}

async function flushCounters(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  var entries = Array.from(pendingCounters.values());
  pendingCounters = new Map();
  if (entries.length === 0) return;

  var database = getDb();
  await Promise.all(
    entries.map(async function (entry) {
      try {
        if (entry.delta !== 0) {
          await applyCounterDelta(database, entry.payload, entry.delta);
        }
        var result = {
          ok: true,
          targetTable: entry.payload.targetTable,
          targetId: entry.payload.targetId,
          counterName: entry.payload.counterName,
          delta: entry.delta,
          batchedJobs: entry.resolve.length,
        };
        for (var resolve of entry.resolve) resolve(result);
      } catch (error) {
        for (var reject of entry.reject) reject(error);
      }
    })
  );
}

export function runCounterIncrementJob(data: unknown): Promise<unknown> {
  var payload = assertPayload(data);
  var key = keyFor(payload);

  return new Promise(function (resolve, reject) {
    var existing = pendingCounters.get(key);
    if (existing) {
      existing.delta += payload.delta;
      existing.resolve.push(resolve);
      existing.reject.push(reject);
    } else {
      pendingCounters.set(key, {
        payload,
        delta: payload.delta,
        resolve: [resolve],
        reject: [reject],
      });
    }

    if (!flushTimer) {
      flushTimer = setTimeout(function () {
        void flushCounters();
      }, batchWindowMs());
    }
  });
}
