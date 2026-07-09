# Catalog Mutation Implementation

> Built from `docs/catalog/spec.md` on 2026-07-07.

## Files

- API helper: `apps/api/src/modules/catalog/mutations.ts`
- API routes: `apps/api/src/modules/catalog/routes.ts`
- API read service: `apps/api/src/modules/catalog/readService.ts`
- API read cache: `apps/api/src/modules/catalog/readCache.ts`
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

## Public Read Surface

- Title, person, and company detail/list endpoints are implemented in `readService.ts` and mounted from `/v1/catalog`.
- Detail reads allow active entities plus merged entities; merged responses include `mergedInto*Id` and compact canonical target metadata from flattened merge pointers.
- Title detail hydrates external IDs and primary media with bounded companion queries, not per-row loops.
- Title/person/company search is DB-backed prefix range search on `sort_title` / `sort_name`. Meilisearch is still not wired.
- Credits, media, aliases, relations, awards, company-title rows, edit queue, and public history all use opaque cursor pagination with `limit + 1`.
- Public history endpoints filter to `catalog_revisions.public_visible = true` and `catalog_edits.public_visible = true`.
- Public catalog GET routes are cached in Upstash Redis under `catalog-read:v1` for 45 seconds. Cache keys normalize path and sorted query params. A Redis index set tracks public catalog read keys; applied stage/apply/revert/merge/batch mutations invalidate that index after commit. If Redis is absent or a cache operation fails, reads fall back to DB and log structured cache errors.

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
- `POST`, `PATCH`, and `DELETE` catalog mutation endpoints use `catalogWriteRateLimit`, a fixed-window Upstash rate limiter keyed by authenticated user ID.
- Public/studio route mutations require `Idempotency-Key` or body `idempotencyKey`.

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
- Public catalog read caching absorbs burst traffic on title/person/company detail and child-list pages. Writes invalidate all public catalog read keys because catalog writes are low-volume and relation/merge changes can affect many read shapes.
- Catalog writes are lower-volume but can be highly contended on award-season/trending titles. Deterministic locking, short transaction-local timeouts, idempotency, and outbox atomicity are the production controls.
- Pending queue depth is out-of-band operational telemetry sampled by the worker, so mutation latency does not grow with review queue size.

## Indexes

The implementation uses existing indexes:

- `catalog_edits_actor_idempotency_idx`
- `catalog_edits_pending_review_idx`
- `catalog_revisions_entity_created_idx`
- `catalog_index_jobs_unprocessed_idx`
- current-state primary keys and existing unique/dedupe indexes

New read-path indexes added in `packages/db/drizzle/0039_catalog_api_read_indexes.sql` and Drizzle schema:

- `catalog_companies_sort_name_idx` for company search/list ordering.
- `catalog_title_relations_from_sort_idx` for title relation cursor ordering when no relation type filter is supplied.
- `catalog_aliases_entity_sort_idx` for aliases by entity and `sort_value` cursor ordering.

`packages/db/drizzle/0040_catalog_title_genre_entity.sql` makes title/genre joins first-class catalog revision entities:

- Adds `title_genre` to `catalog_entity_type`.
- Adds `catalog_title_genres.id` as the shared mutation helper primary key.
- Adds `catalog_title_genres.updated_at` so updates/reverts use the same timestamp behavior as other current-state mutation tables.
- Backfills existing join rows with deterministic ULID-shaped IDs.
- Rebuilds `catalog_title_genres_title_sort_idx` as `(title_id, sort_order, id)`.

## Divergences And Limits

- Meilisearch is still not configured in this repo. The worker relay drains `catalog_index_jobs` into BullMQ `catalog.index` jobs and logs the unconfigured search target. Real Meilisearch document writes remain required before search indexing is production-complete.
- Studio catalog title list/detail/form/import surfaces are wired to `/v1/catalog` read and mutation APIs. Contributions still need mutation/revision pipeline wiring.
- Search relevance beyond indexed prefix fallback still requires Meilisearch configuration, document mapping, and relevance QA. Title/genre joins now use the same stage/apply/revert/revision contract as other catalog mutation entities.
