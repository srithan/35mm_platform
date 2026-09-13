import { and, eq, lt, or, sql } from "drizzle-orm";
import { posts } from "@35mm/db/schema";
import { watchedOnSchema } from "@35mm/validators";
import { badRequest } from "../../lib/errors.js";

export type DiaryCursor = { watchedOn: string; createdAt: string; id: string };

export function diaryWatchDateSql() {
  // Fixed UTC fallback preserves legacy post dates without inventing watch dates.
  return sql<string>`coalesce(${posts.watchedOn}, (${posts.createdAt} at time zone 'UTC')::date)`;
}

export function diaryCreatedAtSql() {
  // JS Date drops microseconds. Cursor strings retain PostgreSQL's full precision.
  return sql<string>`to_char(${posts.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}

export function encodeDiaryCursor(input: DiaryCursor): string {
  return Buffer.from(JSON.stringify({ k: "diary", d: input.watchedOn, c: input.createdAt, i: input.id }), "utf8").toString("base64");
}

export function decodeDiaryCursor(value: string | undefined): DiaryCursor | null {
  if (!value) return null;
  if (value.length > 1024) throw badRequest("Invalid diary cursor");
  try {
    var parsed = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    var createdAt = new Date(parsed.c);
    if (parsed.k !== "diary" || !watchedOnSchema.safeParse(parsed.d).success ||
        typeof parsed.c !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(parsed.c) || !watchedOnSchema.safeParse(parsed.c.slice(0, 10)).success || Number.isNaN(createdAt.getTime()) ||
        typeof parsed.i !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.i)) {
      throw new Error("Invalid diary cursor");
    }
    return { watchedOn: parsed.d, createdAt: parsed.c, id: parsed.i };
  } catch (_error) {
    throw badRequest("Invalid diary cursor");
  }
}

export function diaryCursorSql(cursor: DiaryCursor | null) {
  if (!cursor) return undefined;
  var date = diaryWatchDateSql();
  return or(
    lt(date, cursor.watchedOn),
    and(eq(date, cursor.watchedOn), or(
      lt(posts.createdAt, sql`${cursor.createdAt}::timestamptz`),
      and(eq(posts.createdAt, sql`${cursor.createdAt}::timestamptz`), lt(posts.id, cursor.id))
    ))
  );
}
