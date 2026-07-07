# Catalog Mutation Implementation

> Built from `docs/catalog/spec.md` on 2026-07-07.

## Files

- API helper: `apps/api/src/modules/catalog/mutations.ts`
- API routes: `apps/api/src/modules/catalog/routes.ts`
- Shared DTOs: `packages/types/src/index.ts`
- Shared validators: `packages/validators/src/index.ts`
- Worker relay: `apps/worker/src/jobs/catalogIndex.ts`
- Backfill runner: `apps/api/src/scripts/backfillFilmsToCatalog.ts`

## Helper Surface

- `stageCatalogEdit(input)` validates typed operations, computes entity refs, writes `catalog_edits`, `catalog_revisions`, and `catalog_sources`, then either leaves the edit `pending_review` or applies it in the same transaction.
- `applyCatalogEdit(editId)` locks the edit and target current-state rows with deterministic ordering and transaction-local `SET LOCAL lock_timeout = '2s'`, applies stored `after_data`, marks overlapping pending edits `superseded` using `changed_fields && changed_fields`, and writes `catalog_index_jobs` in the same transaction.
- `rejectCatalogEdit(editId)` locks the edit row, requires `pending_review`, and flips status only.
- `revertCatalogEdit(editId)` locks the applied edit plus affected current-state rows, restores every revision's `before_data`, creates a new revert edit/revisions, marks the original `reverted`, and writes index outbox in the same transaction.
- `mergeCatalogEntities(input)` supports title/person/company merges, flattens existing merge chains, rewrites direct pointers to the final canonical entity, writes merge revision history, and writes index outbox.
- `batchStageCatalogEdits(inputs, { chunkSize })` stages chunks through the same helper path. A thrown row rolls back its chunk and returns diagnostics for every row in that chunk.

## Transaction And Contention

- All writes use `getWriteDb().transaction(...)`; no helper opens ad-hoc pool connections.
- `SET LOCAL lock_timeout = '2s'` is issued inside apply/reject/revert/merge transactions, so timeout scope ends with the transaction.
- Current-state row locks are grouped by whitelisted entity type, sorted by entity type and ID, and use `FOR UPDATE`.
- Lock timeout maps to `409 CONFLICT` and emits `catalog.lock_timeout`.
- Index outbox rows are inserted before commit in the same transaction as applied/reverted/merged current-state mutations. If the outbox insert fails, the whole mutation rolls back.

## Idempotency

- Actor/key retries use the existing `(actor_user_id, idempotency_key)` unique index.
- The helper also takes a transaction-level advisory lock on `(actor || key)` before checking/inserting, which makes null-actor system/import retries race-safe even though PostgreSQL unique indexes allow multiple null actor values.
- Existing edit lookup returns `outcome: "existing"` regardless of current edit status.

## Route Trust And Rate Limits

- Public catalog mutation endpoints derive `source` server-side from the authenticated caller's Clerk Studio role.
- Callers with Studio catalog write roles are staged as `source = "studio"` on the REST mutation endpoints.
- Other authenticated callers are staged as `source = "contribution"`.
- Client-supplied `source` is ignored on those public REST mutation endpoints. `system` and `import` are helper/backfill paths, not public-client trust claims.
- `POST /v1/catalog/titles`, `/people`, `/credits`, and `/media` use `catalogWriteRateLimit`, a fixed-window Upstash rate limiter keyed by authenticated user ID.

## Observability

The repo has no StatsD/OpenTelemetry convention. Existing production observability is structured `console.*`, so catalog emits structured logs:

- `[catalog.mutation]`: operation, edit ID, actor, source, entity refs, outcome, duration, error when present.
- `[catalog.metric] catalog.mutation.count`
- `[catalog.metric] catalog.lock_timeout`
- `[catalog.metric] catalog.index_job_lag_ms`
- `[catalog.metric] catalog.pending_queue_depth`

`catalog.pending_queue_depth` is sampled by the worker's repeatable `catalog.index.outbox` relay, not from the synchronous mutation path.

## Scale Assumptions

- Catalog reads are high-volume and should use current-state tables/search indexes; mutation helpers are not on hot read paths.
- Catalog writes are lower-volume but can be highly contended on award-season/trending titles. Deterministic locking, short transaction-local timeouts, idempotency, and outbox atomicity are the production controls.
- Pending queue depth is out-of-band operational telemetry sampled by the worker, so mutation latency does not grow with review queue size.

## Indexes

No new schema indexes were needed. The implementation uses existing indexes:

- `catalog_edits_actor_idempotency_idx`
- `catalog_edits_pending_review_idx`
- `catalog_revisions_entity_created_idx`
- `catalog_index_jobs_unprocessed_idx`
- current-state primary keys and existing unique/dedupe indexes

## Divergences And Limits

- Meilisearch is still not configured in this repo. The worker relay drains `catalog_index_jobs` into BullMQ `catalog.index` jobs and logs the unconfigured search target. Real Meilisearch document writes remain required before search indexing is production-complete.
- Full Studio/Contributions UI rewiring was intentionally not touched in this pass.
- Public API route coverage currently exposes title/person/credit/media mutation endpoints plus approve/reject/revert/history. External ID/source validation exists in shared schemas; separate REST endpoints can be added without changing the helper.
