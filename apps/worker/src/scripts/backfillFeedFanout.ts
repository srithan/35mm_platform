import { pathToFileURL } from "node:url";
import { createDb } from "@35mm/db";
import { feedFanoutOutbox, posts } from "@35mm/db/schema";
import { and, asc, eq, gte, lt, ne, or, sql } from "drizzle-orm";

export type FeedFanoutBackfillCursor = {
  createdAt: string;
  id: string;
} | null;

export type FeedFanoutBackfillOptions = {
  from: Date;
  to: Date;
  dryRun: boolean;
  limit: number | null;
  batchSize: number;
};

function parseDateFlag(name: string, raw: string): Date {
  var parsed = new Date(raw);
  if (!raw.trim() || Number.isNaN(parsed.getTime())) {
    throw new Error(name + " requires an ISO-8601 timestamp");
  }
  return parsed;
}

function parsePositiveInteger(name: string, raw: string): number {
  var parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(name + " requires a positive integer");
  }
  return parsed;
}

export function parseFeedFanoutBackfillArgs(argv: string[]): FeedFanoutBackfillOptions {
  var from: Date | null = null;
  var to: Date | null = null;
  var dryRun = false;
  var limit: number | null = null;
  var batchSize = 250;

  for (var i = 0; i < argv.length; i += 1) {
    var arg = argv[i];
    if (arg === "--") continue;
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--from=")) {
      from = parseDateFlag("--from", arg.slice("--from=".length));
      continue;
    }
    if (arg.startsWith("--to=")) {
      to = parseDateFlag("--to", arg.slice("--to=".length));
      continue;
    }
    if (arg.startsWith("--limit=")) {
      limit = parsePositiveInteger("--limit", arg.slice("--limit=".length));
      continue;
    }
    if (arg.startsWith("--batch-size=")) {
      batchSize = Math.min(
        parsePositiveInteger("--batch-size", arg.slice("--batch-size=".length)),
        1_000
      );
      continue;
    }
    throw new Error("Unknown argument: " + arg);
  }

  if (!from) throw new Error("--from is required");
  if (!to) throw new Error("--to is required");
  if (from.getTime() >= to.getTime()) {
    throw new Error("--from must be earlier than --to");
  }

  return { from, to, dryRun, limit, batchSize };
}

function databaseUrl(): string {
  var value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("Missing required environment variable: DATABASE_URL");
  return value;
}

function cursorFilter(cursor: FeedFanoutBackfillCursor) {
  if (!cursor) return undefined;
  return or(
    sql`${posts.createdAt} > ${cursor.createdAt}::timestamptz`,
    and(
      sql`${posts.createdAt} = ${cursor.createdAt}::timestamptz`,
      sql`${posts.id} > ${cursor.id}::uuid`
    )
  );
}

export function advanceFeedFanoutBackfillCursor(
  current: FeedFanoutBackfillCursor,
  next: Exclude<FeedFanoutBackfillCursor, null>
): Exclude<FeedFanoutBackfillCursor, null> {
  if (current && current.createdAt === next.createdAt && current.id === next.id) {
    throw new Error("Feed fanout backfill cursor did not advance");
  }
  return next;
}

export async function runFeedFanoutBackfill(options: FeedFanoutBackfillOptions): Promise<{
  scanned: number;
  inserted: number;
}> {
  var database = createDb(databaseUrl());
  var cursor: FeedFanoutBackfillCursor = null;
  var scanned = 0;
  var inserted = 0;

  console.log("[feed-fanout-backfill] start", {
    from: options.from.toISOString(),
    to: options.to.toISOString(),
    dryRun: options.dryRun,
    limit: options.limit,
    batchSize: options.batchSize,
  });

  for (;;) {
    if (options.limit != null && scanned >= options.limit) break;
    var pageSize = options.limit == null
      ? options.batchSize
      : Math.min(options.batchSize, options.limit - scanned);
    if (pageSize <= 0) break;

    var filters = [
      gte(posts.createdAt, options.from),
      lt(posts.createdAt, options.to),
      eq(posts.isDeleted, false),
      ne(posts.visibility, "private"),
      eq(posts.moderationStatus, "visible"),
    ];
    var afterCursor = cursorFilter(cursor);
    if (afterCursor) filters.push(afterCursor);

    var rows = await database
      .select({
        postId: posts.id,
        authorUserId: posts.userId,
        createdAtCursor: sql<string>`${posts.createdAt}::text`,
      })
      .from(posts)
      .where(and(...filters))
      .orderBy(asc(posts.createdAt), asc(posts.id))
      .limit(pageSize);

    if (rows.length === 0) break;
    scanned += rows.length;

    if (!options.dryRun) {
      var insertedRows = await database
        .insert(feedFanoutOutbox)
        .values(rows.map(function (row) {
          return {
            postId: row.postId,
            authorUserId: row.authorUserId,
            nextAttemptAt: new Date(),
          };
        }))
        .onConflictDoNothing({
          target: feedFanoutOutbox.postId,
        })
        .returning({ id: feedFanoutOutbox.id });
      inserted += insertedRows.length;
    }

    var tail = rows[rows.length - 1];
    cursor = advanceFeedFanoutBackfillCursor(cursor, {
      createdAt: tail.createdAtCursor,
      id: tail.postId,
    });
    console.log("[feed-fanout-backfill] progress", {
      scanned,
      inserted,
      dryRun: options.dryRun,
      cursor: cursor
        ? { createdAt: cursor.createdAt, id: cursor.id }
        : null,
    });
    if (rows.length < pageSize) break;
  }

  console.log("[feed-fanout-backfill] done", {
    scanned,
    inserted,
    dryRun: options.dryRun,
  });
  return { scanned, inserted };
}

async function main(): Promise<void> {
  var options = parseFeedFanoutBackfillArgs(process.argv.slice(2));
  await runFeedFanoutBackfill(options);
}

var invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  void main().catch(function (error) {
    console.error("[feed-fanout-backfill] failed", error);
    process.exitCode = 1;
  });
}
