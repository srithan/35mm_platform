import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createPooledDb } from "@35mm/db";
import { sql } from "drizzle-orm";

var { enqueueNsfwScanJob } = vi.hoisted(function () {
  return {
    enqueueNsfwScanJob: vi.fn(async function () {
      return true;
    }),
  };
});

vi.mock("../../lib/jobs.js", function () {
  return {
    enqueueModerationAutoHideCheckJob: vi.fn(async function () {
      return true;
    }),
    enqueueNsfwScanJob,
  };
});

import { initDb } from "../../lib/db.js";
import { createReport } from "../moderation/reports.js";

function loadDbEnv(): void {
  if (process.env.DATABASE_URL) return;
  var envPath = resolve(process.cwd(), ".env");
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
if (runDbTests && process.env.DATABASE_URL) initDb(process.env.DATABASE_URL);

const AUTHOR_ID = "00000000-0000-4000-8000-000000009201";
const REPORTER_ID = "00000000-0000-4000-8000-000000009202";
const POST_ID = "00000000-0000-4000-8000-000000009203";
const ROLLBACK_POST_ID = "00000000-0000-4000-8000-000000009204";

function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  return createPooledDb(process.env.DATABASE_URL);
}

async function cleanup(): Promise<void> {
  if (!runDbTests) return;
  await db().execute(sql`delete from reports where content_type = 'post' and content_id in (${POST_ID}, ${ROLLBACK_POST_ID})`);
  await db().execute(sql`delete from moderation_content_state where content_type = 'post' and content_id in (${POST_ID}, ${ROLLBACK_POST_ID})`);
  await db().execute(sql`delete from posts where id in (${POST_ID}, ${ROLLBACK_POST_ID})`);
  await db().execute(sql`delete from profiles where user_id in (${AUTHOR_ID}, ${REPORTER_ID})`);
  await db().execute(sql`delete from users where id in (${AUTHOR_ID}, ${REPORTER_ID})`);
}

describeDb("NSFW API transaction behavior", function () {
  beforeAll(async function () {
    await cleanup();
    await db().execute(sql`
      insert into users (id, clerk_user_id, email, age_verified_at, status)
      values
        (${AUTHOR_ID}, 'clerk_nsfw_author', 'nsfw-author@example.com', now(), 'active'),
        (${REPORTER_ID}, 'clerk_nsfw_reporter', 'nsfw-reporter@example.com', now(), 'active')
    `);
    await db().execute(sql`
      insert into profiles (user_id, username, display_name)
      values
        (${AUTHOR_ID}, 'nsfw-author', 'NSFW Author'),
        (${REPORTER_ID}, 'nsfw-reporter', 'NSFW Reporter')
    `);
    await db().execute(sql`
      insert into posts (id, user_id, type, body, visibility, nsfw_status)
      values (${POST_ID}, ${AUTHOR_ID}, 'text', 'DB NSFW report target', 'public', 'none')
    `);
  }, 30000);

  afterAll(async function () {
    await cleanup();
  }, 30000);

  it("enqueues a priority scan for matching reports against unclassified content", async function () {
    enqueueNsfwScanJob.mockClear();
    await createReport(REPORTER_ID, {
      contentType: "post",
      contentId: POST_ID,
      reason: "nudity_sexual_content",
    });
    expect(enqueueNsfwScanJob).toHaveBeenCalledWith({
      contentType: "post",
      contentId: POST_ID,
      priority: true,
    });
  });

  it("rolls back author NSFW flags with a failed post transaction", async function () {
    await expect(db().transaction(async function (tx) {
      await tx.execute(sql`
        insert into posts (
          id, user_id, type, body, visibility,
          nsfw_status, nsfw_categories, nsfw_source
        )
        values (
          ${ROLLBACK_POST_ID}, ${AUTHOR_ID}, 'text', 'rollback', 'public',
          'flagged', array['nudity']::text[], 'author'
        )
      `);
      throw new Error("forced post transaction failure");
    })).rejects.toThrow("forced post transaction failure");

    var rows = await db().execute(sql`
      select id from posts where id = ${ROLLBACK_POST_ID}
    `);
    expect(rows.rows).toHaveLength(0);
  });
});
