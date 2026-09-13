import { execFile, execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// This suite only connects to an explicitly supplied local test socket, never DATABASE_URL.
const socket = process.env.FILM_DIARY_TEST_SOCKET;
const suite = socket ? describe : describe.skip;
const schema = `film_diary_test_${randomUUID().replaceAll("-", "")}`;
const args = ["-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-h", socket ?? "/invalid", "-p", process.env.FILM_DIARY_TEST_PORT ?? "55492", "-U", "diary_test", "-d", "postgres"];
const owner = "11111111-1111-4111-8111-111111111111";
const otherOwner = "11111111-1111-4111-8111-111111111112";
const key = "22222222-2222-4222-8222-222222222222";

function query(sql: string) {
  return execFileSync("psql", args, { input: `SET search_path TO "${schema}";\n${sql}`, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

suite("film diary PostgreSQL migration", function () {
  beforeAll(function () {
    if (!socket?.startsWith("/private/tmp/") && !socket?.startsWith("/tmp/")) throw new Error("Film diary DB tests require an isolated /tmp socket");
    const onlineIndexes = readFileSync(new URL("../../../../../packages/db/operations/0065_film_diary_indexes.sql", import.meta.url), "utf8");
    const migration = readFileSync(new URL("../../../../../packages/db/drizzle/0065_film_diary_watch_details.sql", import.meta.url), "utf8");
    const watchVenueMigration = readFileSync(new URL("../../../../../packages/db/drizzle/0067_fuzzy_sunspot.sql", import.meta.url), "utf8");
    query(`
      CREATE SCHEMA "${schema}";
      SET search_path TO "${schema}";
      CREATE TYPE post_type AS ENUM ('text', 'discussion', 'log', 'review', 'image');
      CREATE TYPE post_visibility AS ENUM ('public', 'followers_only', 'private');
      CREATE TABLE posts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
        type post_type NOT NULL DEFAULT 'text', body text NOT NULL, film_id text,
        film_rating smallint, visibility post_visibility NOT NULL DEFAULT 'public',
        is_repost boolean NOT NULL DEFAULT false, is_deleted boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE post_edits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL, body text NOT NULL, headline text, edited_at timestamptz NOT NULL DEFAULT now());
      INSERT INTO posts (user_id, type, body, created_at) VALUES ('${owner}', 'log', 'Legacy log', '2026-01-01T00:30:00Z');
      BEGIN;
      ${migration}
      ${watchVenueMigration}
      COMMIT;
    `);
    query(onlineIndexes);
  });

  afterAll(function () {
    if (socket) query(`DROP SCHEMA "${schema}" CASCADE;`);
  });

  it("preserves unknown legacy watch dates and UTC fallback across session timezones", function () {
    expect(query(`SET TIME ZONE 'America/Los_Angeles'; SELECT watched_on IS NULL, is_rewatch, coalesce(watched_on, (created_at AT TIME ZONE 'UTC')::date) FROM posts WHERE body = 'Legacy log';`)).toBe("t|f|2026-01-01");
    expect(query(`SET TIME ZONE 'Pacific/Auckland'; SELECT coalesce(watched_on, (created_at AT TIME ZONE 'UTC')::date) FROM posts WHERE body = 'Legacy log';`)).toBe("2026-01-01");
  });

  it("orders backdated entries by watched day and paginates ties without gaps", function () {
    query(`INSERT INTO posts (id, user_id, type, body, watched_on, created_at) VALUES
      ('33333333-3333-4333-8333-333333333331', '${owner}', 'log', 'Older watch', '2025-01-01', '2026-09-13T03:00:00Z'),
      ('33333333-3333-4333-8333-333333333332', '${owner}', 'review', 'Recent watch A', '2026-01-02', '2026-09-13T01:00:00Z'),
      ('33333333-3333-4333-8333-333333333333', '${owner}', 'review', 'Recent watch B', '2026-01-02', '2026-09-13T01:00:00Z');`);
    const order = "coalesce(watched_on, (created_at AT TIME ZONE 'UTC')::date) DESC, created_at DESC, id DESC";
    const eligible = `user_id = '${owner}' AND type IN ('log', 'review') AND is_repost = false AND is_deleted = false`;
    expect(query(`SELECT body FROM posts WHERE ${eligible} ORDER BY ${order} LIMIT 2;`).split("\n")).toEqual(["Recent watch B", "Recent watch A"]);
    expect(query(`SELECT body FROM posts WHERE ${eligible} AND (coalesce(watched_on, (created_at AT TIME ZONE 'UTC')::date), created_at, id) < ('2026-01-02'::date, '2026-09-13T01:00:00Z'::timestamptz, '33333333-3333-4333-8333-333333333332'::uuid) ORDER BY ${order} LIMIT 2;`).split("\n")).toEqual(["Legacy log", "Older watch"]);
    expect(query(`SET enable_seqscan = off; EXPLAIN SELECT id FROM posts WHERE ${eligible} ORDER BY ${order} LIMIT 2;`)).toContain("posts_user_diary_watch_date_idx");
  });

  it("retains microseconds when two entries share the same watched date and millisecond", function () {
    query(`INSERT INTO posts (id, user_id, type, body, watched_on, created_at) VALUES
      ('44444444-4444-4444-8444-444444444441', '${owner}', 'log', 'Microsecond first', '2026-02-01', '2026-09-13T01:00:00.123456Z'),
      ('44444444-4444-4444-8444-444444444442', '${owner}', 'log', 'Microsecond second', '2026-02-01', '2026-09-13T01:00:00.123123Z');`);
    expect(query(`SELECT to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') FROM posts WHERE body = 'Microsecond first';`)).toBe("2026-09-13T01:00:00.123456Z");
    expect(query(`SELECT body FROM posts WHERE watched_on = '2026-02-01' AND (created_at, id) < ('2026-09-13T01:00:00.123456Z'::timestamptz, '44444444-4444-4444-8444-444444444441'::uuid) ORDER BY created_at DESC, id DESC LIMIT 1;`)).toBe("Microsecond second");
  });

  it("enforces watch-detail type constraints and real dates at the database boundary", function () {
    expect(() => query(`INSERT INTO posts (user_id, type, body, watched_on) VALUES ('${owner}', 'text', 'Invalid', '2026-01-01');`)).toThrow();
    expect(() => query(`INSERT INTO posts (user_id, type, body, watch_venue) VALUES ('${owner}', 'text', 'Invalid', 'streaming');`)).toThrow();
    expect(() => query(`INSERT INTO posts (user_id, type, body, watched_on) VALUES ('${owner}', 'log', '', '2025-02-29');`)).toThrow();
    expect(() => query(`INSERT INTO posts (user_id, type, body, creation_key) VALUES ('${owner}', 'log', '', '${key}');`)).toThrow();
  });

  it("deduplicates concurrent retry keys per author while allowing another author", async function () {
    const asyncExec = promisify(execFile);
    const insert = `INSERT INTO posts (user_id, type, body, creation_key, creation_request_hash) VALUES ('${owner}', 'log', '', '${key}', 'same-hash') ON CONFLICT (user_id, creation_key) WHERE creation_key IS NOT NULL DO NOTHING RETURNING id;`;
    const start = `SET search_path TO "${schema}";`;
    const results = await Promise.all([
      asyncExec("psql", [...args, "-c", start, "-c", "BEGIN", "-c", insert, "-c", "SELECT pg_sleep(0.1)", "-c", "COMMIT"]),
      asyncExec("psql", [...args, "-c", start, "-c", insert]),
    ]);
    expect(results.flatMap(result => result.stdout.trim().split("\n").filter(line => /^[0-9a-f-]{36}$/.test(line)))).toHaveLength(1);
    expect(query(`SELECT count(*) FROM posts WHERE user_id = '${owner}' AND creation_key = '${key}';`)).toBe("1");
    query(`INSERT INTO posts (user_id, type, body, creation_key, creation_request_hash) VALUES ('${otherOwner}', 'log', '', '${key}', 'same-hash');`);
    expect(query(`SELECT count(*) FROM posts WHERE creation_key = '${key}';`)).toBe("2");
    query(`UPDATE posts SET is_deleted = true WHERE user_id = '${owner}' AND creation_key = '${key}';`);
    expect(query(insert)).toBe("");
  });

  it("stores prior watch details, rating, type, and visibility in edit history", function () {
    query(`INSERT INTO post_edits (post_id, body, type, film_id, film_rating, watched_on, watch_venue, is_rewatch, visibility)
      VALUES ('33333333-3333-4333-8333-333333333333', 'Old note', 'review', '01ARZ3NDEKTSV4RRFFQ69G5FAV', 7, '2024-02-29', 'theater', true, 'private');`);
    expect(query("SELECT type, film_rating, watched_on, watch_venue, is_rewatch, visibility FROM post_edits;")).toBe("review|7|2024-02-29|theater|t|private");
  });
});
