import { createDb, type Db } from "@35mm/db";
import {
  comments,
  filmLists,
  pollOptions,
  postPolls,
  posts,
  profiles,
} from "@35mm/db/schema";
import { eq, sql } from "drizzle-orm";
import { loadWorkerEnv } from "../lib/env.js";

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
  | "filmsLoggedCount";

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
var pendingCounters = new Map<string, PendingCounter>();
var flushTimer: NodeJS.Timeout | null = null;

function getDb(): Db {
  if (!db) {
    db = createDb(loadWorkerEnv().DATABASE_URL);
  }
  return db;
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
    profiles: ["filmsLoggedCount"],
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
  database: Db,
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

  throw new Error(
    "Unsupported counter.increment target: " +
      payload.targetTable +
      "." +
      payload.counterName
  );
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
