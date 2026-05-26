import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { createDb } from "@35mm/db";
import { posts } from "@35mm/db/schema";
import { loadWorkerEnv } from "../lib/env.js";
import { postNeedsMediaProcessing, processMediaRows } from "../jobs/mediaProcess.js";

type Cursor = { createdAt: Date; id: string } | null;

function postCursorWhere(cursor: Cursor) {
  if (!cursor) return undefined;
  return or(
    lt(posts.createdAt, cursor.createdAt),
    and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id))
  );
}

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
};

function parsePositiveInt(raw: string): number | null {
  var trimmed = raw.trim();
  if (!trimmed) return null;
  var parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  if (!Number.isInteger(parsed)) return null;
  if (parsed <= 0) return null;
  return parsed;
}

function parseCliArgs(argv: string[]): CliOptions {
  var dryRun = false;
  var limit: number | null = null;

  for (var i = 0; i < argv.length; i += 1) {
    var arg = argv[i];
    if (arg === "--") {
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--limit") {
      var next = argv[i + 1];
      if (!next) {
        throw new Error("--limit requires a positive integer value");
      }
      var parsed = parsePositiveInt(next);
      if (parsed == null) {
        throw new Error("--limit requires a positive integer value");
      }
      limit = parsed;
      i += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      var inlineParsed = parsePositiveInt(arg.slice("--limit=".length));
      if (inlineParsed == null) {
        throw new Error("--limit requires a positive integer value");
      }
      limit = inlineParsed;
      continue;
    }

    throw new Error("Unknown argument: " + arg);
  }

  return { dryRun, limit };
}

async function main() {
  var options = parseCliArgs(process.argv.slice(2));
  var env = loadWorkerEnv();
  var db = createDb(env.DATABASE_URL);
  var batchSize = Number.isFinite(env.MEDIA_BACKFILL_BATCH_SIZE)
    ? Math.max(1, env.MEDIA_BACKFILL_BATCH_SIZE)
    : 100;
  var cursor: Cursor = null;
  var scanned = 0;
  var updated = 0;
  var candidates = 0;

  console.log("[media-backfill] start", {
    dryRun: options.dryRun,
    limit: options.limit,
    batchSize,
  });

  while (true) {
    if (options.limit != null && scanned >= options.limit) break;

    var pageLimit =
      options.limit == null
        ? batchSize
        : Math.min(batchSize, Math.max(1, options.limit - scanned));
    var whereCursor = postCursorWhere(cursor);
    var filters = [eq(posts.isDeleted, false), sql`${posts.media} <> '[]'::jsonb`];
    if (whereCursor) filters.push(whereCursor);

    var rows = await db
      .select({
        id: posts.id,
        createdAt: posts.createdAt,
        media: posts.media,
        mediaUrls: posts.mediaUrls,
      })
      .from(posts)
      .where(and(...filters))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(pageLimit);

    if (rows.length === 0) break;

    scanned += rows.length;
    var rowMedia = rows.map(function (row) {
      return {
        id: row.id,
        media: row.media,
        mediaUrls: row.mediaUrls,
      };
    });
    var rowsNeedingWork = rowMedia.filter(function (row) {
      return postNeedsMediaProcessing(row.media);
    });
    candidates += rowsNeedingWork.length;
    if (!options.dryRun) {
      var updatedNow = await processMediaRows(rowsNeedingWork);
      updated += updatedNow;
    }

    var tail = rows[rows.length - 1];
    cursor = tail ? { createdAt: tail.createdAt, id: tail.id } : null;
    console.log("[media-backfill] scanned", scanned, "candidates", candidates, "updated", updated);
  }

  console.log(
    "[media-backfill] done.",
    "scanned=",
    scanned,
    "candidates=",
    candidates,
    "updated=",
    updated,
    "dryRun=",
    options.dryRun
  );
}

void main().catch(function (error) {
  console.error("[media-backfill] failed", error);
  process.exitCode = 1;
});
