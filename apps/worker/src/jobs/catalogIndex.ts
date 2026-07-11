import type { Queue } from "bullmq";
import { createPooledDb, type CatalogIndexJobPayload } from "@35mm/db";
import { sql } from "drizzle-orm";
import { loadWorkerEnv } from "../lib/env.js";

type CatalogIndexOutboxPayload = {
  batchSize?: number;
};

type CatalogIndexQueuePayload = {
  outboxJobId: string;
  editId: string | null;
  payload: CatalogIndexJobPayload;
};

type CatalogOutboxRow = {
  id: string;
  edit_id: string | null;
  payload: CatalogIndexJobPayload;
  created_at: Date | string;
};

var db: ReturnType<typeof createPooledDb> | null = null;

function getDb() {
  if (!db) db = createPooledDb(loadWorkerEnv().DATABASE_URL);
  return db;
}

function configuredBatchSize(payload: CatalogIndexOutboxPayload): number {
  var envValue = Number(process.env.CATALOG_INDEX_OUTBOX_BATCH_SIZE ?? "100");
  var raw = Number(payload.batchSize ?? envValue);
  if (!Number.isFinite(raw)) return 100;
  return Math.max(1, Math.min(Math.floor(raw), 500));
}

function logMetric(name: string, value: number, tags: Record<string, string | number | boolean | null> = {}) {
  console.log("[catalog.metric]", { name, value, tags });
}

export async function runCatalogIndexOutboxJob(
  payloadValue: unknown,
  queue: Queue
): Promise<{ processed: number; batchSize: number }> {
  var payload = (payloadValue && typeof payloadValue === "object"
    ? payloadValue
    : {}) as CatalogIndexOutboxPayload;
  var batchSize = configuredBatchSize(payload);
  var database = getDb();

  var processed = await database.transaction(async function (tx) {
    var selected = await tx.execute<CatalogOutboxRow>(sql`
      with next_jobs as (
        select "id"
        from "catalog_index_jobs"
        where "processed_at" is null
          and "available_at" <= now()
        order by "created_at" asc, "id" asc
        limit ${batchSize}
        for update skip locked
      )
      update "catalog_index_jobs" jobs
      set "status" = 'processing',
          "processing_started_at" = now(),
          "attempt_count" = jobs."attempt_count" + 1,
          "updated_at" = now()
      from next_jobs
      where jobs."id" = next_jobs."id"
      returning jobs."id", jobs."edit_id", jobs."payload", jobs."created_at"
    `);

    var rows = selected.rows;
    for (var row of rows) {
      await queue.add("catalog.index", {
        outboxJobId: row.id,
        editId: row.edit_id,
        payload: row.payload,
      } satisfies CatalogIndexQueuePayload, {
        jobId: "catalog.index-" + row.id,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 2_000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
      });
      var lagMs = Date.now() - new Date(row.created_at).getTime();
      logMetric("catalog.index_job_lag_ms", lagMs, { outboxJobId: row.id });
    }

    if (rows.length > 0) {
      await tx.execute(sql`
        update "catalog_index_jobs"
        set "status" = 'processed',
            "processed_at" = now(),
            "updated_at" = now()
        where "id" in (${sql.join(rows.map(function (row) {
          return sql`${row.id}`;
        }), sql`, `)})
      `);
    }

    return rows.length;
  });

  console.log("[catalog.index.outbox] drained", { processed, batchSize });
  await logCatalogPendingQueueDepth(database);
  return { processed, batchSize };
}

async function logCatalogPendingQueueDepth(database: ReturnType<typeof createPooledDb>): Promise<void> {
  try {
    var pending = await database.execute<{ count: number }>(sql`
      select count(*)::int as "count"
      from "catalog_edits"
      where "status" = 'pending_review'
    `);
    logMetric("catalog.pending_queue_depth", Number(pending.rows[0]?.count ?? 0), {});
  } catch (error) {
    console.warn("[catalog.metric] pending queue depth failed", { error });
  }
}

export async function runCatalogIndexJob(payloadValue: unknown): Promise<{ indexed: number; searchTarget: string }> {
  var payload = payloadValue as CatalogIndexQueuePayload;
  if (!payload || typeof payload !== "object" || !payload.payload || !Array.isArray(payload.payload.entities)) {
    throw new Error("Invalid catalog.index payload");
  }

  var meiliHost = process.env.MEILISEARCH_HOST ?? process.env.MEILI_HOST ?? "";
  if (!meiliHost.trim()) {
    console.warn("[catalog.index] search backend unavailable; BullMQ relay completed without Meilisearch write", {
      outboxJobId: payload.outboxJobId,
      editId: payload.editId,
      entities: payload.payload.entities,
      reason: payload.payload.reason,
    });
    return { indexed: payload.payload.entities.length, searchTarget: "unconfigured" };
  }

  console.log("[catalog.index] queued for search backend", {
    outboxJobId: payload.outboxJobId,
    editId: payload.editId,
    entities: payload.payload.entities,
    reason: payload.payload.reason,
    searchTarget: "meilisearch",
  });
  return { indexed: payload.payload.entities.length, searchTarget: "meilisearch" };
}
