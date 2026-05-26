import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { createDb } from "@35mm/db";
import { posts } from "@35mm/db/schema";
import { loadWorkerEnv } from "../lib/env.js";
import { processMediaRows } from "../jobs/mediaProcess.js";

type Cursor = { createdAt: Date; id: string } | null;

function postCursorWhere(cursor: Cursor) {
  if (!cursor) return undefined;
  return or(
    lt(posts.createdAt, cursor.createdAt),
    and(eq(posts.createdAt, cursor.createdAt), lt(posts.id, cursor.id))
  );
}

async function main() {
  var env = loadWorkerEnv();
  var db = createDb(env.DATABASE_URL);
  var batchSize = Number.isFinite(env.MEDIA_BACKFILL_BATCH_SIZE)
    ? Math.max(1, env.MEDIA_BACKFILL_BATCH_SIZE)
    : 100;
  var cursor: Cursor = null;
  var scanned = 0;
  var updated = 0;

  while (true) {
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
      .limit(batchSize);

    if (rows.length === 0) break;

    scanned += rows.length;
    var updatedNow = await processMediaRows(
      rows.map(function (row) {
        return {
          id: row.id,
          media: row.media,
          mediaUrls: row.mediaUrls,
        };
      })
    );
    updated += updatedNow;

    var tail = rows[rows.length - 1];
    cursor = tail ? { createdAt: tail.createdAt, id: tail.id } : null;
    console.log("[media-backfill] scanned", scanned, "updated", updated);
  }

  console.log("[media-backfill] done. scanned=", scanned, "updated=", updated);
}

void main().catch(function (error) {
  console.error("[media-backfill] failed", error);
  process.exitCode = 1;
});
