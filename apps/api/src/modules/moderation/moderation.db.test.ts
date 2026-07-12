import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";
import { initDb, getWriteDb } from "../../lib/db.js";

vi.mock("../../lib/jobs.js", function () {
  return {
    enqueueModerationAutoHideCheckJob: vi.fn(async function () { return true; }),
    enqueueModerationNotificationOutboxJob: vi.fn(async function () { return true; }),
  };
});
vi.mock("../../lib/feedCache.js", function () {
  return {
    invalidateAuthorProfileFeedCaches: vi.fn(async function () { return 0; }),
    invalidateFeedCacheForGuest: vi.fn(async function () { return 0; }),
    invalidateHighFollowerAuthorFeedCache: vi.fn(async function () { return 0; }),
    invalidateViewerFeedCaches: vi.fn(async function () { return 0; }),
  };
});
vi.mock("../../lib/moderationRead.js", function () {
  return {
    markModerationProfileStatsDirty: vi.fn(async function () { return true; }),
    setModerationReadStatus: vi.fn(async function () { return true; }),
  };
});
vi.mock("../../lib/profileStatsCache.js", function () {
  return { invalidateProfileStatsCaches: vi.fn(async function () { return 0; }) };
});

import { applyModerationAction } from "./actions.js";
import { createReport, getReportForUser } from "./reports.js";

function loadApiEnvForDbTests(): void {
  if (process.env.DATABASE_URL) return;
  var envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  var content = readFileSync(envPath, "utf8");
  for (var line of content.split(/\r?\n/)) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    var index = trimmed.indexOf("=");
    if (index <= 0) continue;
    var key = trimmed.slice(0, index).trim();
    var value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

if (process.env.RUN_MODERATION_DB_TESTS === "1") loadApiEnvForDbTests();
var runDbTests = process.env.RUN_MODERATION_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);
var describeDb = runDbTests ? describe : describe.skip;
if (runDbTests && process.env.DATABASE_URL) initDb(process.env.DATABASE_URL);

const AUTHOR_ID = "00000000-0000-4000-8000-000000009101";
const REPORTER_ONE_ID = "00000000-0000-4000-8000-000000009102";
const REPORTER_TWO_ID = "00000000-0000-4000-8000-000000009103";
const ACTOR_ID = "00000000-0000-4000-8000-000000009104";
const POST_ID = "00000000-0000-4000-8000-000000009105";
const USER_IDS = [AUTHOR_ID, REPORTER_ONE_ID, REPORTER_TWO_ID, ACTOR_ID];

async function cleanup(): Promise<void> {
  if (!runDbTests) return;
  var db = getWriteDb();
  await db.execute(sql`delete from notifications where source_key like 'moderation:test:%'`);
  await db.execute(sql`delete from moderation_notification_outbox where action_id in (select id from moderation_actions where content_id = ${POST_ID})`);
  await db.execute(sql`delete from reports where content_type = 'post' and content_id = ${POST_ID}`);
  await db.execute(sql`delete from reports where content_type = 'profile' and content_id = ${AUTHOR_ID}`);
  await db.execute(sql`delete from moderation_actions where content_type = 'post' and content_id = ${POST_ID}`);
  await db.execute(sql`delete from moderation_content_state where content_type = 'post' and content_id = ${POST_ID}`);
  await db.execute(sql`delete from moderation_content_state where content_type = 'profile' and content_id = ${AUTHOR_ID}`);
  await db.execute(sql`delete from posts where id = ${POST_ID}`);
  await db.execute(sql`delete from profiles where user_id in (${AUTHOR_ID}, ${REPORTER_ONE_ID}, ${REPORTER_TWO_ID}, ${ACTOR_ID})`);
  await db.execute(sql`delete from users where id in (${AUTHOR_ID}, ${REPORTER_ONE_ID}, ${REPORTER_TWO_ID}, ${ACTOR_ID})`);
}

async function seed(): Promise<void> {
  var db = getWriteDb();
  for (var [index, userId] of USER_IDS.entries()) {
    await db.execute(sql`
      insert into users (id, clerk_user_id, email, age_verified_at, status)
      values (${userId}, ${"clerk_moderation_test_" + index}, ${"moderation-test-" + index + "@example.com"}, now(), 'active')
    `);
    await db.execute(sql`
      insert into profiles (user_id, username, display_name)
      values (${userId}, ${"moderation-test-" + index}, ${"Moderation Test " + index})
    `);
  }
  await db.execute(sql`
    insert into posts (id, user_id, type, body, visibility)
    values (${POST_ID}, ${AUTHOR_ID}, 'text', 'Moderation DB test post', 'public')
  `);
}

describeDb("moderation transaction behavior", function () {
  beforeAll(async function () {
    await cleanup();
    await seed();
  }, 30000);

  afterAll(async function () {
    await cleanup();
  }, 30000);

  it("dedupes an unresolved report without incrementing state twice", async function () {
    var input = { contentType: "post" as const, contentId: POST_ID, reason: "spam" as const };
    var first = await createReport(REPORTER_ONE_ID, input);
    var retry = await createReport(REPORTER_ONE_ID, input);

    expect(first.created).toBe(true);
    expect(retry.created).toBe(false);
    expect(retry.report.id).toBe(first.report.id);

    var storedSnapshotRows = await getWriteDb().execute(sql`
      select content_snapshot from reports where id = ${first.report.id}
    `);
    expect(storedSnapshotRows.rows[0]?.content_snapshot).toMatchObject({
      author_username: "moderation-test-0",
      author_display_name: "Moderation Test 0",
      post_type: "text",
      created_at: expect.any(String),
    });

    await getWriteDb().execute(sql`
      update reports
      set content_snapshot = content_snapshot
        - 'author_username'
        - 'author_display_name'
        - 'author_avatar_url'
        - 'author_avatar_variants'
        - 'post_type'
        - 'created_at'
      where id = ${first.report.id}
    `);

    var detail = await getReportForUser({
      reporterUserId: REPORTER_ONE_ID,
      reportId: first.report.id,
    });
    expect(detail.contentSnapshot).toMatchObject({
      body: "Moderation DB test post",
      media: [],
      visibility: "public",
      author_username: "moderation-test-0",
      author_display_name: "Moderation Test 0",
      post_type: "text",
      created_at: expect.any(String),
    });
    expect(detail.contentSnapshot).not.toHaveProperty("author_id");
    await expect(getReportForUser({
      reporterUserId: REPORTER_TWO_ID,
      reportId: first.report.id,
    })).rejects.toThrow("Report was not found");

    var state = await getWriteDb().execute(sql`
      select report_count from moderation_content_state
      where content_type = 'post' and content_id = ${POST_ID}
    `);
    expect(Number(state.rows[0]?.report_count)).toBe(1);
  });

  it("commits action, report resolution, strike, and notification outbox exactly once", async function () {
    await createReport(REPORTER_TWO_ID, {
      contentType: "post",
      contentId: POST_ID,
      reason: "harassment",
    });
    var actionInput = {
      contentType: "post" as const,
      contentId: POST_ID,
      actorUserId: ACTOR_ID,
      actorRole: "admin" as const,
      idempotencyKey: "moderation-db-action-0001",
      payload: {
        action: "user_warned" as const,
        reason: "Moderation DB policy test",
        notes: "Internal test note",
        metadata: {},
      },
    };
    var action = await applyModerationAction(actionInput);
    var retry = await applyModerationAction(actionInput);
    expect(retry.id).toBe(action.id);

    var reportRows = await getWriteDb().execute(sql`
      select status, resolved_action_id from reports
      where content_type = 'post' and content_id = ${POST_ID}
    `);
    expect(reportRows.rows).toHaveLength(2);
    expect(reportRows.rows.every(function (row) {
      return row.status === "actioned" && row.resolved_action_id === action.id;
    })).toBe(true);

    var profileRows = await getWriteDb().execute(sql`select strike_count from profiles where user_id = ${AUTHOR_ID}`);
    expect(Number(profileRows.rows[0]?.strike_count)).toBe(1);

    var outboxRows = await getWriteDb().execute(sql`
      select action_id, resolution, status from moderation_notification_outbox
      where action_id = ${action.id}
    `);
    expect(outboxRows.rows).toEqual([{ action_id: action.id, resolution: "actioned", status: "pending" }]);

    var actionRows = await getWriteDb().execute(sql`
      select count(*)::integer as count from moderation_actions
      where actor_user_id = ${ACTOR_ID} and idempotency_key = ${actionInput.idempotencyKey}
    `);
    expect(Number(actionRows.rows[0]?.count)).toBe(1);
  });

  it("captures profile bio, social counts, and joined date", async function () {
    await getWriteDb().execute(sql`
      update profiles
      set bio = 'Moderation profile snapshot bio',
          post_count = 128,
          follower_count = 12400,
          following_count = 315
      where user_id = ${AUTHOR_ID}
    `);
    var created = await createReport(REPORTER_TWO_ID, {
      contentType: "profile",
      contentId: AUTHOR_ID,
      reason: "impersonation",
    });
    var detail = await getReportForUser({
      reporterUserId: REPORTER_TWO_ID,
      reportId: created.report.id,
    });
    expect(detail.contentSnapshot).toMatchObject({
      bio: "Moderation profile snapshot bio",
      display_name: "Moderation Test 0",
      username: "moderation-test-0",
      post_count: 128,
      follower_count: 12400,
      following_count: 315,
      joined_at: expect.any(String),
    });
    expect(detail.contentSnapshot).not.toHaveProperty("avatar_variants");
  });

  it("allows the same reporter to report again after resolution", async function () {
    var created = await createReport(REPORTER_ONE_ID, {
      contentType: "post",
      contentId: POST_ID,
      reason: "other",
      details: "New behavior after prior resolution",
    });
    expect(created.created).toBe(true);
    expect(created.report.status).toBe("open");

    await applyModerationAction({
      contentType: "post",
      contentId: POST_ID,
      actorUserId: ACTOR_ID,
      actorRole: "admin",
      idempotencyKey: "moderation-db-action-ban-0002",
      payload: {
        action: "user_banned",
        reason: "Repeated severe policy violation",
        metadata: {},
      },
    });
    var accountRows = await getWriteDb().execute(sql`
      select u.status as account_status, p.moderation_status as profile_status
      from users u inner join profiles p on p.user_id = u.id
      where u.id = ${AUTHOR_ID}
    `);
    expect(accountRows.rows[0]).toEqual({ account_status: "banned", profile_status: "removed" });
  });
});
