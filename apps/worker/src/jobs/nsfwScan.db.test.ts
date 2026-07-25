import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPooledDb } from "@35mm/db";
import { sql } from "drizzle-orm";
import { runNsfwScanJob } from "./nsfwScan.js";

function loadDbEnv(): void {
  if (process.env.DATABASE_URL) return;
  var envPath = resolve(process.cwd(), "../api/.env");
  if (!existsSync(envPath)) return;
  for (var line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    var index = trimmed.indexOf("=");
    if (index <= 0) continue;
    var key = trimmed.slice(0, index).trim();
    var value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

if (process.env.RUN_NSFW_DB_TESTS === "1") loadDbEnv();
var runDbTests = process.env.RUN_NSFW_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);
var describeDb = runDbTests ? describe : describe.skip;

const AUTHOR_ID = "00000000-0000-4000-8000-000000009211";
const POST_ID = "00000000-0000-4000-8000-000000009212";

function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  return createPooledDb(process.env.DATABASE_URL);
}

async function cleanup(): Promise<void> {
  if (!runDbTests) return;
  await db().execute(sql`delete from posts where id = ${POST_ID}`);
  await db().execute(sql`delete from profiles where user_id = ${AUTHOR_ID}`);
  await db().execute(sql`delete from users where id = ${AUTHOR_ID}`);
}

describeDb("NSFW worker DB behavior", function () {
  beforeAll(async function () {
    await cleanup();
    await db().execute(sql`
      insert into users (id, clerk_user_id, email, age_verified_at, status)
      values (${AUTHOR_ID}, 'clerk_nsfw_worker', 'nsfw-worker@example.com', now(), 'active')
    `);
    await db().execute(sql`
      insert into profiles (user_id, username, display_name)
      values (${AUTHOR_ID}, 'nsfw-worker', 'NSFW Worker')
    `);
    await db().execute(sql`
      insert into posts (
        id, user_id, type, body, visibility,
        nsfw_status, nsfw_categories, nsfw_source
      )
      values (
        ${POST_ID}, ${AUTHOR_ID}, 'text', 'classified body', 'public',
        'flagged', array['nudity']::text[], 'author'
      )
    `);
  }, 30000);

  afterAll(async function () {
    await cleanup();
  }, 30000);

  it("is idempotent across repeated scans", async function () {
    var classifier = {
      classifyText: async function () {
        return ["violence" as const];
      },
      classifyImage: async function () {
        return [];
      },
    };
    await runNsfwScanJob({ contentType: "post", contentId: POST_ID }, classifier);
    await runNsfwScanJob({ contentType: "post", contentId: POST_ID }, classifier);

    var rows = await db().execute(sql`
      select nsfw_status, nsfw_categories, nsfw_source
      from posts where id = ${POST_ID}
    `);
    expect(rows.rows[0]).toEqual({
      nsfw_status: "flagged",
      nsfw_categories: ["nudity", "violence"],
      nsfw_source: "author",
    });
  });
});
