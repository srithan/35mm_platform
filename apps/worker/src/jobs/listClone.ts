import { createDb, filmListEntries, filmLists } from "@35mm/db";
import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import type { Queue } from "bullmq";
import { ulid } from "ulid";
import { loadWorkerEnv } from "../lib/env.js";

type ListCloneJobPayload = {
  sourceListId: string;
  targetListId: string;
  cursor: string | null;
};

type ListEntryRow = {
  id: string;
  filmId: string;
  position: number | null;
  note: string | null;
  addedAt: Date;
};

type ListEntryCursor = {
  position: number;
  addedAt: string;
  id: string;
};

var batchSize = 100;
var db: ReturnType<typeof createDb> | null = null;

function getDb() {
  if (db) return db;
  var env = loadWorkerEnv();
  db = createDb(env.DATABASE_URL);
  return db;
}

function decodeCursor(cursor: string | null): ListEntryCursor | null {
  if (!cursor) return null;
  try {
    var parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as {
      p?: unknown;
      a?: unknown;
      i?: unknown;
    };

    if (
      typeof parsed.p !== "number" ||
      Number.isFinite(parsed.p) === false ||
      typeof parsed.a !== "string" ||
      typeof parsed.i !== "string" ||
      parsed.i.length === 0
    ) {
      throw new Error("invalid-shape");
    }

    var addedAt = new Date(parsed.a);
    if (Number.isNaN(addedAt.getTime())) {
      throw new Error("invalid-date");
    }

    return {
      position: parsed.p,
      addedAt: parsed.a,
      id: parsed.i,
    };
  } catch (_error) {
    throw new Error("Invalid clone cursor");
  }
}

function encodeCursor(input: {
  position: number;
  addedAt: string;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      p: input.position,
      a: input.addedAt,
      i: input.id,
    }),
    "utf8"
  ).toString("base64");
}

function decodePosition(position: number | null): number {
  return position == null ? -1 : position;
}

function assertPayload(value: unknown): ListCloneJobPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid list.clone payload");
  }

  var payload = value as Partial<ListCloneJobPayload>;
  if (typeof payload.sourceListId !== "string" || payload.sourceListId.trim().length === 0) {
    throw new Error("Invalid list.clone payload: sourceListId");
  }
  if (typeof payload.targetListId !== "string" || payload.targetListId.trim().length === 0) {
    throw new Error("Invalid list.clone payload: targetListId");
  }

  var cursor = payload.cursor;
  if (cursor != null && (typeof cursor !== "string" || cursor.trim().length === 0)) {
    throw new Error("Invalid list.clone payload: cursor");
  }

  return {
    sourceListId: payload.sourceListId.trim(),
    targetListId: payload.targetListId.trim(),
    cursor: typeof cursor === "string" ? cursor.trim() : null,
  };
}

function cloneJobId(targetListId: string, cursor: string | null): string {
  return "list.clone-" + targetListId + "-" + (cursor ? Buffer.from(cursor).toString("hex") : "start");
}

async function readSourceRows(sourceListId: string, cursor: string | null): Promise<{
  items: ListEntryRow[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  var database = getDb();
  var parsedCursor = decodeCursor(cursor);
  var orderPosition = sql<number>`coalesce(${filmListEntries.position}, -1)`;
  var cursorWhere = parsedCursor
    ? or(
        gt(orderPosition, decodePosition(parsedCursor.position)),
        and(
          eq(orderPosition, decodePosition(parsedCursor.position)),
          gt(filmListEntries.addedAt, new Date(parsedCursor.addedAt))
        ),
        and(
          eq(orderPosition, decodePosition(parsedCursor.position)),
          eq(filmListEntries.addedAt, new Date(parsedCursor.addedAt)),
          gt(filmListEntries.id, parsedCursor.id)
        )
      )
    : undefined;

  var rows = await database
    .select({
      id: filmListEntries.id,
      filmId: filmListEntries.filmId,
      position: filmListEntries.position,
      note: filmListEntries.note,
      addedAt: filmListEntries.addedAt,
    })
    .from(filmListEntries)
    .where(and(eq(filmListEntries.listId, sourceListId), cursorWhere))
    .orderBy(asc(orderPosition), asc(filmListEntries.addedAt), asc(filmListEntries.id))
    .limit(batchSize + 1);

  var pageRows = rows.slice(0, batchSize);
  var hasMore = rows.length > batchSize;
  var lastRow = pageRows[pageRows.length - 1];

  return {
    items: pageRows,
    hasMore,
    nextCursor:
      hasMore && lastRow
        ? encodeCursor({
            position: decodePosition(lastRow.position),
            addedAt: lastRow.addedAt.toISOString(),
            id: lastRow.id,
          })
        : null,
  };
}

async function incrementTargetEntryCount(targetListId: string, insertedCount: number): Promise<void> {
  if (insertedCount <= 0) return;

  var database = getDb();
  await database
    .update(filmLists)
    .set({ entryCount: sql`${filmLists.entryCount} + ${insertedCount}` })
    .where(eq(filmLists.id, targetListId));
}

export async function runListCloneJob(payloadValue: unknown, queue: Queue): Promise<{
  inserted: number;
  hasMore: boolean;
  nextCursor: string | null;
}> {
  var payload = assertPayload(payloadValue);
  var database = getDb();

  var rows = await database
    .select({ id: filmLists.id, isDeleted: filmLists.isDeleted })
    .from(filmLists)
    .where(eq(filmLists.id, payload.targetListId))
    .limit(1);

  if (!rows.length || rows[0].isDeleted) {
    return {
      inserted: 0,
      hasMore: false,
      nextCursor: null,
    };
  }

  var sourceRows = await database
    .select({ id: filmLists.id })
    .from(filmLists)
    .where(eq(filmLists.id, payload.sourceListId))
    .limit(1);
  if (!sourceRows.length) {
    return {
      inserted: 0,
      hasMore: false,
      nextCursor: null,
    };
  }

  var page = await readSourceRows(payload.sourceListId, payload.cursor);
  if (page.items.length === 0) {
    return {
      inserted: 0,
      hasMore: false,
      nextCursor: null,
    };
  }

  var insertedRows = await database
    .insert(filmListEntries)
    .values(
      page.items.map(function (entry) {
        return {
          id: ulid(),
          listId: payload.targetListId,
          filmId: entry.filmId,
          position: entry.position,
          note: entry.note,
        };
      })
    )
    .onConflictDoNothing({
      target: [filmListEntries.listId, filmListEntries.filmId],
    })
    .returning({ id: filmListEntries.id });

  var inserted = insertedRows.length;
  await incrementTargetEntryCount(payload.targetListId, inserted);

  if (page.hasMore && page.nextCursor) {
    await queue.add("list.clone", {
      sourceListId: payload.sourceListId,
      targetListId: payload.targetListId,
      cursor: page.nextCursor,
    }, {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: true,
      removeOnFail: 1000,
      jobId: cloneJobId(payload.targetListId, page.nextCursor),
    });
  }

  return {
    inserted,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  };
}
