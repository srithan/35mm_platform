import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { initDb, getWriteDb } from "../../lib/db.js";
import { createUlid } from "../../lib/ulid.js";

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

if (process.env.RUN_CATALOG_DB_TESTS === "1") {
  loadApiEnvForDbTests();
}

var runDbTests = process.env.RUN_CATALOG_DB_TESTS === "1" && Boolean(process.env.DATABASE_URL);
var describeDb = runDbTests ? describe : describe.skip;

if (runDbTests && process.env.DATABASE_URL) {
  initDb(process.env.DATABASE_URL);
}

type JsonRecord = Record<string, any>;

const SUMMARY_PREFIX = "catalog route workflow";
const SLUG_PREFIX = "catalog-route-workflow-";
const ACTOR_USER_ID = "00000000-0000-4000-8000-000000000101";

async function cleanupRows(): Promise<void> {
  if (!runDbTests) return;
  var db = getWriteDb();
  await db.execute(sql`
    delete from "catalog_index_jobs"
    where "edit_id" in (
      select "id"
      from "catalog_edits"
      where "summary" like ${SUMMARY_PREFIX + "%"}
         or "summary" like ${"Revert: " + SUMMARY_PREFIX + "%"}
    )
  `);
  await db.execute(sql`
    delete from "catalog_revisions"
    where "edit_id" in (
      select "id"
      from "catalog_edits"
      where "summary" like ${SUMMARY_PREFIX + "%"}
         or "summary" like ${"Revert: " + SUMMARY_PREFIX + "%"}
    )
  `);
  await db.execute(sql`
    delete from "catalog_edits"
    where "summary" like ${SUMMARY_PREFIX + "%"}
       or "summary" like ${"Revert: " + SUMMARY_PREFIX + "%"}
  `);
  await db.execute(sql`delete from "catalog_titles" where "slug" like ${SLUG_PREFIX + "%"}`);
  await db.execute(sql`delete from "users" where "id" = ${ACTOR_USER_ID}`);
}

async function seedActorUser(): Promise<void> {
  if (!runDbTests) return;
  await getWriteDb().execute(sql`
    insert into "users" ("id", "clerk_user_id", "email", "age_verified_at", "status")
    values (${ACTOR_USER_ID}, 'clerk_catalog_workflow', 'catalog-workflow@example.com', now(), 'active')
    on conflict ("id") do update
    set "clerk_user_id" = excluded."clerk_user_id",
        "email" = excluded."email",
        "updated_at" = now()
  `);
}

async function makeApp(role: "catalog" | "viewer"): Promise<Hono> {
  vi.resetModules();
  vi.doMock("@clerk/backend", function () {
    return {
      createClerkClient: function () {
        return {
          users: {
            getUser: async function () {
              return {
                publicMetadata: role === "catalog" ? { studioRole: "catalog" } : {},
                unsafeMetadata: {},
              };
            },
          },
        };
      },
    };
  });
  vi.doMock("../../lib/middleware.js", function () {
    return {
      requireAuth: async function (c: any, next: () => Promise<void>) {
        c.set("user", {
          clerkUserId: "clerk_catalog_workflow",
          userId: ACTOR_USER_ID,
          username: "catalog-workflow",
          displayName: "Catalog Workflow",
          avatarUrl: null,
        });
        await next();
      },
    };
  });
  vi.doMock("../../lib/rateLimit.js", function () {
    return {
      identifyByUserId: function () {
        return ACTOR_USER_ID;
      },
      createRateLimitMiddleware: function () {
        return async function (_c: any, next: () => Promise<void>) {
          await next();
        };
      },
    };
  });

  if (process.env.DATABASE_URL) {
    var dbModule = await import("../../lib/db.js");
    dbModule.initDb(process.env.DATABASE_URL);
  }
  var { catalogRoutes } = await import("./routes.js");
  var app = new Hono();
  app.onError(function (err: any, c) {
    return c.json({ code: err.code ?? "INTERNAL_ERROR", message: err.message }, err.status ?? 500);
  });
  app.route("/v1/catalog", catalogRoutes);
  return app;
}

async function requestJson<T = JsonRecord>(
  app: Hono,
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: T }> {
  var response = await app.request(path, init);
  return {
    status: response.status,
    body: await response.json() as T,
  };
}

function titleBody(id: string, label: string) {
  var slug = SLUG_PREFIX + label + "-" + id.toLowerCase();
  return {
    summary: SUMMARY_PREFIX + " " + label,
    data: {
      type: "movie",
      primaryTitle: "Catalog Route Workflow " + label,
      sortTitle: "catalog route workflow " + label,
      slug,
    },
  };
}

describeDb("catalog moderation workflow through HTTP routes", function () {
  beforeAll(async function () {
    await cleanupRows();
    await seedActorUser();
  }, 30000);

  afterEach(async function () {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterAll(async function () {
    await cleanupRows();
  }, 30000);

  it("stages contribution edits, approves them, exposes public reads, and reverts current state", async function () {
    var titleId = createUlid();
    var contributor = await makeApp("viewer");
    var moderator = await makeApp("catalog");

    var staged = await requestJson(contributor, "/v1/catalog/titles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test",
        "Idempotency-Key": "catalog-route-workflow-approve-" + titleId,
      },
      body: JSON.stringify({
        summary: titleBody(titleId, "approve").summary,
        operations: [{
          entityType: "title",
          action: "create",
          entityId: titleId,
          data: titleBody(titleId, "approve").data,
          publicVisible: true,
        }],
      }),
    });
    expect(staged.status).toBe(201);
    expect(staged.body.edit).toMatchObject({ status: "pending_review", source: "contribution" });

    var hidden = await requestJson(moderator, "/v1/catalog/titles/" + titleId);
    expect(hidden.status).toBe(404);

    var approved = await requestJson(moderator, "/v1/catalog/edits/" + staged.body.edit.id + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
      body: JSON.stringify({ rationale: "verified fixture source" }),
    });
    expect(approved.status).toBe(200);
    expect(approved.body.edit).toMatchObject({ id: staged.body.edit.id, status: "applied" });

    var detail = await requestJson(moderator, "/v1/catalog/titles/" + titleId);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: titleId,
      primaryTitle: "Catalog Route Workflow approve",
      status: "active",
    });

    var reverted = await requestJson(moderator, "/v1/catalog/edits/" + staged.body.edit.id + "/revert", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
      body: JSON.stringify({ rationale: "bad duplicate" }),
    });
    expect(reverted.status).toBe(200);
    expect(reverted.body.edit).toMatchObject({ id: staged.body.edit.id, status: "reverted" });

    var afterRevert = await requestJson(moderator, "/v1/catalog/titles/" + titleId);
    expect(afterRevert.status).toBe(404);
  }, 30000);

  it("rejects contribution edits without mutating public catalog state", async function () {
    var titleId = createUlid();
    var contributor = await makeApp("viewer");
    var moderator = await makeApp("catalog");

    var staged = await requestJson(contributor, "/v1/catalog/titles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test",
        "Idempotency-Key": "catalog-route-workflow-reject-" + titleId,
      },
      body: JSON.stringify({
        summary: titleBody(titleId, "reject").summary,
        operations: [{
          entityType: "title",
          action: "create",
          entityId: titleId,
          data: titleBody(titleId, "reject").data,
          publicVisible: true,
        }],
      }),
    });
    expect(staged.status).toBe(201);

    var rejected = await requestJson(moderator, "/v1/catalog/edits/" + staged.body.edit.id + "/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
      body: JSON.stringify({ rationale: "not enough evidence" }),
    });
    expect(rejected.status).toBe(200);
    expect(rejected.body.edit).toMatchObject({ id: staged.body.edit.id, status: "rejected" });

    var detail = await requestJson(moderator, "/v1/catalog/titles/" + titleId);
    expect(detail.status).toBe(404);
  }, 30000);
});
