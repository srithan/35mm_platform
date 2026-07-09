import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { catalogIndexJobs, catalogTitles } from "@35mm/db/schema";
import { eq } from "drizzle-orm";
import { initDb, getDb, getWriteDb } from "../../lib/db.js";
import { createUlid } from "../../lib/ulid.js";
import {
  applyCatalogEdit,
  batchStageCatalogEdits,
  mergeCatalogEntities,
  revertCatalogEdit,
  setCatalogMutationTestHooksForTest,
  stageCatalogEdit,
  catalogMutationInternalsForTest,
} from "./mutations.js";

describe("catalog mutation internals", function () {
  it("uses changed fields, not entity-only matching, for supersede decisions", function () {
    var synopsis = catalogMutationInternalsForTest.changedFieldsFor({
      entityType: "title",
      entityId: createUlid(),
      action: "update",
      data: { synopsis: "new" },
      publicVisible: true,
    });
    var runtime = catalogMutationInternalsForTest.changedFieldsFor({
      entityType: "title",
      entityId: createUlid(),
      action: "update",
      data: { runtimeMinutes: 120 },
      publicVisible: true,
    });

    expect(synopsis).toEqual(["synopsis"]);
    expect(runtime).toEqual(["runtimeMinutes"]);
  });

  it("dedupes and sorts entity refs for deterministic lock ordering", function () {
    var titleId = createUlid();
    var personId = createUlid();
    var refs = catalogMutationInternalsForTest.entityRefsFor([
      { entityType: "title", entityId: titleId, action: "update", data: {}, publicVisible: true },
      { entityType: "person", entityId: personId, action: "update", data: {}, publicVisible: true },
      { entityType: "title", entityId: titleId, action: "delete", data: {}, publicVisible: true },
    ]);

    expect(refs).toEqual([
      { entityType: "person", entityId: personId },
      { entityType: "title", entityId: titleId },
    ]);
  });
});

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

async function createAppliedTitle(id: string) {
  return stageCatalogEdit({
    actorUserId: null,
    source: "system",
    summary: "test title",
    rationale: null,
    idempotencyKey: "test-title:" + id,
    publicVisible: false,
    sourceSnapshotAt: new Date().toISOString(),
    operations: [{
      entityType: "title",
      action: "create",
      entityId: id,
      data: {
        type: "movie",
        primaryTitle: "Catalog Test " + id,
        sortTitle: "catalog test " + id,
        slug: "catalog-test-" + id.toLowerCase(),
      },
      publicVisible: false,
    }],
    sources: [],
  });
}

describeDb("catalog mutation database behavior", function () {
  afterAll(async function () {
    if (!runDbTests) return;
    await getWriteDb().execute(sql`
      delete from "catalog_index_jobs" where "edit_id" in (
        select "id" from "catalog_edits" where "summary" like 'test %' or "summary" like 'concurrent %'
      )
    `);
    await getWriteDb().execute(sql`delete from "catalog_revisions" where "edit_id" in (select "id" from "catalog_edits" where "summary" like 'test %' or "summary" like 'concurrent %')`);
    await getWriteDb().execute(sql`delete from "catalog_edits" where "summary" like 'test %' or "summary" like 'concurrent %'`);
    await getWriteDb().execute(sql`delete from "catalog_title_genres" where "title_id" in (select "id" from "catalog_titles" where "primary_title" like 'Catalog Test %' or "primary_title" like 'Concurrent Test %')`);
    await getWriteDb().execute(sql`delete from "catalog_genres" where "name" like 'Catalog Test Genre %'`);
    await getWriteDb().execute(sql`delete from "catalog_titles" where "primary_title" like 'Catalog Test %' or "primary_title" like 'Concurrent Test %'`);
  });

  it("rolls back cleanly on lock timeout during apply", async function () {
    var titleId = createUlid();
    await createAppliedTitle(titleId);
    var staged = await stageCatalogEdit({
      actorUserId: null,
      source: "contribution",
      summary: "test pending lock timeout",
      rationale: null,
      idempotencyKey: "test-lock:" + titleId,
      publicVisible: false,
      sourceSnapshotAt: null,
      operations: [{
        entityType: "title",
        action: "update",
        entityId: titleId,
        data: { synopsis: "locked" },
        publicVisible: false,
      }],
      sources: [],
    });

    var lockHolder: { release: (() => void) | null } = { release: null };
    var holding = getWriteDb().transaction(async function (tx) {
      await tx.execute(sql`select "id" from "catalog_titles" where "id" = ${titleId} for update`);
      await new Promise<void>(function (resolve) {
        lockHolder.release = resolve;
      });
    });

    await expect(applyCatalogEdit(staged.edit.id, null)).rejects.toMatchObject({ status: 409 });
    lockHolder.release?.();
    await holding;

    var editRows = await getDb().execute(sql`select "status" from "catalog_edits" where "id" = ${staged.edit.id}`);
    expect(editRows.rows[0]).toMatchObject({ status: "pending_review" });
    var outbox = await getDb().select().from(catalogIndexJobs).where(eq(catalogIndexJobs.editId, staged.edit.id));
    expect(outbox).toHaveLength(0);
  }, 10000);

  it("commits current-state changes and outbox rows together for apply and revert", async function () {
    var titleId = createUlid();
    await createAppliedTitle(titleId);
    var staged = await stageCatalogEdit({
      actorUserId: null,
      source: "contribution",
      summary: "test outbox atomicity",
      rationale: null,
      idempotencyKey: "test-outbox:" + titleId,
      publicVisible: false,
      sourceSnapshotAt: null,
      operations: [{
        entityType: "title",
        action: "update",
        entityId: titleId,
        data: { synopsis: "applied synopsis" },
        publicVisible: false,
      }],
      sources: [],
    });

    await applyCatalogEdit(staged.edit.id, null);
    var titleRows = await getDb().select().from(catalogTitles).where(eq(catalogTitles.id, titleId)).limit(1);
    expect(titleRows[0].synopsis).toBe("applied synopsis");
    var applyOutbox = await getDb().select().from(catalogIndexJobs).where(eq(catalogIndexJobs.editId, staged.edit.id));
    expect(applyOutbox).toHaveLength(1);

    await revertCatalogEdit(staged.edit.id, null);
    var revertedRows = await getDb().select().from(catalogTitles).where(eq(catalogTitles.id, titleId)).limit(1);
    expect(revertedRows[0].synopsis).toBeNull();
  });

  it("rolls back current-state and status changes when outbox insert path fails before commit", async function () {
    var titleId = createUlid();
    await createAppliedTitle(titleId);
    var staged = await stageCatalogEdit({
      actorUserId: null,
      source: "contribution",
      summary: "test outbox precommit failure",
      rationale: null,
      idempotencyKey: "test-outbox-failure:" + titleId,
      publicVisible: false,
      sourceSnapshotAt: null,
      operations: [{
        entityType: "title",
        action: "update",
        entityId: titleId,
        data: { synopsis: "should rollback" },
        publicVisible: false,
      }],
      sources: [],
    });

    setCatalogMutationTestHooksForTest({
      beforeIndexJob: function () {
        throw new Error("simulate outbox precommit failure");
      },
    });
    try {
      await expect(applyCatalogEdit(staged.edit.id, null)).rejects.toThrow("simulate outbox precommit failure");
    } finally {
      setCatalogMutationTestHooksForTest({});
    }

    var titleRows = await getDb().select().from(catalogTitles).where(eq(catalogTitles.id, titleId)).limit(1);
    expect(titleRows[0].synopsis).toBeNull();
    var editRows = await getDb().execute(sql`select "status" from "catalog_edits" where "id" = ${staged.edit.id}`);
    expect(editRows.rows[0]).toMatchObject({ status: "pending_review" });
    var outbox = await getDb().select().from(catalogIndexJobs).where(eq(catalogIndexJobs.editId, staged.edit.id));
    expect(outbox).toHaveLength(0);
  });

  it("rolls back a whole batch chunk when one row conflicts", async function () {
    var titleId = createUlid();
    var duplicateSlug = "batch-conflict-" + titleId.toLowerCase();
    var result = await batchStageCatalogEdits([
      {
        actorUserId: null,
        source: "system",
        summary: "test batch valid",
        rationale: null,
        idempotencyKey: "batch-valid:" + titleId,
        publicVisible: false,
        sourceSnapshotAt: new Date().toISOString(),
        operations: [{ entityType: "title", action: "create", entityId: titleId, data: { type: "movie", primaryTitle: "Catalog Test " + titleId, sortTitle: "catalog", slug: duplicateSlug }, publicVisible: false }],
        sources: [],
      },
      {
        actorUserId: null,
        source: "system",
        summary: "test batch conflict",
        rationale: null,
        idempotencyKey: "batch-conflict:" + titleId,
        publicVisible: false,
        sourceSnapshotAt: new Date().toISOString(),
        operations: [{ entityType: "title", action: "create", entityId: createUlid(), data: { type: "movie", primaryTitle: "Catalog Test conflict", sortTitle: "catalog", slug: duplicateSlug }, publicVisible: false }],
        sources: [],
      },
    ], { chunkSize: 2 });

    expect(result.diagnostics.every(function (item) { return !item.ok; })).toBe(true);
    var rows = await getDb().select().from(catalogTitles).where(eq(catalogTitles.id, titleId));
    expect(rows).toHaveLength(0);
  });

  it("keeps hot-title concurrent applies deterministic", async function () {
    var titleId = createUlid();
    await createAppliedTitle(titleId);
    var staged = await Promise.all(Array.from({ length: 8 }, async function (_value, index) {
      return stageCatalogEdit({
        actorUserId: null,
        source: "contribution",
        summary: "concurrent edit " + index,
        rationale: null,
        idempotencyKey: "concurrent:" + titleId + ":" + index,
        publicVisible: false,
        sourceSnapshotAt: null,
        operations: [{
          entityType: "title",
          action: "update",
          entityId: titleId,
          data: { synopsis: "synopsis " + index },
          publicVisible: false,
        }],
        sources: [],
      });
    }));

    var results = await Promise.allSettled(staged.map(function (item) {
      return applyCatalogEdit(item.edit.id, null);
    }));
    var fulfilled = results.filter(function (item) {
      return item.status === "fulfilled";
    });
    var rejected = results.filter(function (item) {
      return item.status === "rejected";
    }) as PromiseRejectedResult[];
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    expect(fulfilled.length + rejected.length).toBe(8);
    for (var item of rejected) {
      expect(item.reason).toMatchObject({ status: 409 });
    }
  }, 20000);

  it("flattens merge chains so reads never chase A to B to C", async function () {
    var titleA = createUlid();
    var titleB = createUlid();
    var titleC = createUlid();
    await createAppliedTitle(titleA);
    await createAppliedTitle(titleB);
    await createAppliedTitle(titleC);

    await getWriteDb().execute(sql`
      update "catalog_titles"
      set "status" = 'merged',
          "merged_into_title_id" = ${titleB},
          "updated_at" = now()
      where "id" = ${titleA}
    `);

    await mergeCatalogEntities({
      entityType: "title",
      duplicateEntityId: titleB,
      canonicalEntityId: titleC,
      actorUserId: null,
      source: "system",
      summary: "test merge flattening",
      rationale: null,
      idempotencyKey: "test-merge-flatten:" + titleB,
      publicVisible: false,
      sources: [],
    });

    var rows = await getDb().execute(sql`
      select "id", "merged_into_title_id" as "mergedIntoTitleId"
      from "catalog_titles"
      where "id" in (${titleA}, ${titleB}, ${titleC})
    `);
    var byId = new Map((rows.rows as Array<{ id: string; mergedIntoTitleId: string | null }>).map(function (row) {
      return [row.id, row.mergedIntoTitleId];
    }));
    expect(byId.get(titleA)).toBe(titleC);
    expect(byId.get(titleB)).toBe(titleC);
    expect(byId.get(titleC)).toBeNull();
  }, 20000);

  it("creates, updates, deletes, and reverts title_genre rows", async function () {
    var titleId = createUlid();
    var genreId = createUlid();
    var titleGenreId = createUlid();
    await createAppliedTitle(titleId);
    await getWriteDb().execute(sql`
      insert into "catalog_genres" ("id", "slug", "name", "sort_order")
      values (${genreId}, ${"catalog-test-genre-" + genreId.toLowerCase()}, ${"Catalog Test Genre " + genreId}, 1)
    `);

    var createEdit = await stageCatalogEdit({
      actorUserId: null,
      source: "system",
      summary: "test title genre create",
      rationale: null,
      idempotencyKey: "test-title-genre-create:" + titleGenreId,
      publicVisible: false,
      sourceSnapshotAt: new Date().toISOString(),
      operations: [{
        entityType: "title_genre",
        action: "create",
        entityId: titleGenreId,
        data: { titleId, genreId, sortOrder: 2 },
        publicVisible: false,
      }],
      sources: [],
    });
    expect(createEdit.outcome).toBe("applied");

    var created = await getDb().execute(sql`
      select "id", "title_id" as "titleId", "genre_id" as "genreId", "sort_order" as "sortOrder"
      from "catalog_title_genres"
      where "id" = ${titleGenreId}
    `);
    expect(created.rows[0]).toMatchObject({ id: titleGenreId, titleId, genreId, sortOrder: 2 });

    var updateEdit = await stageCatalogEdit({
      actorUserId: null,
      source: "system",
      summary: "test title genre update",
      rationale: null,
      idempotencyKey: "test-title-genre-update:" + titleGenreId,
      publicVisible: false,
      sourceSnapshotAt: new Date().toISOString(),
      operations: [{
        entityType: "title_genre",
        action: "update",
        entityId: titleGenreId,
        data: { sortOrder: 7 },
        publicVisible: false,
      }],
      sources: [],
    });
    expect(updateEdit.outcome).toBe("applied");

    var updated = await getDb().execute(sql`
      select "sort_order" as "sortOrder"
      from "catalog_title_genres"
      where "id" = ${titleGenreId}
    `);
    expect(updated.rows[0]).toMatchObject({ sortOrder: 7 });

    await revertCatalogEdit(updateEdit.edit.id, null);
    var revertedUpdate = await getDb().execute(sql`
      select "sort_order" as "sortOrder"
      from "catalog_title_genres"
      where "id" = ${titleGenreId}
    `);
    expect(revertedUpdate.rows[0]).toMatchObject({ sortOrder: 2 });

    var deleteEdit = await stageCatalogEdit({
      actorUserId: null,
      source: "system",
      summary: "test title genre delete",
      rationale: null,
      idempotencyKey: "test-title-genre-delete:" + titleGenreId,
      publicVisible: false,
      sourceSnapshotAt: new Date().toISOString(),
      operations: [{
        entityType: "title_genre",
        action: "delete",
        entityId: titleGenreId,
        data: {},
        publicVisible: false,
      }],
      sources: [],
    });
    expect(deleteEdit.outcome).toBe("applied");

    var deleted = await getDb().execute(sql`select "id" from "catalog_title_genres" where "id" = ${titleGenreId}`);
    expect(deleted.rows).toHaveLength(0);

    await revertCatalogEdit(deleteEdit.edit.id, null);
    var revertedDelete = await getDb().execute(sql`
      select "id", "sort_order" as "sortOrder"
      from "catalog_title_genres"
      where "id" = ${titleGenreId}
    `);
    expect(revertedDelete.rows[0]).toMatchObject({ id: titleGenreId, sortOrder: 2 });

    await revertCatalogEdit(createEdit.edit.id, null);
    var revertedCreate = await getDb().execute(sql`select "id" from "catalog_title_genres" where "id" = ${titleGenreId}`);
    expect(revertedCreate.rows).toHaveLength(0);
  }, 20000);
});
