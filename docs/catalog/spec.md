# 35mm Catalog Mutation Layer

> Single implementation reference for catalog mutation helpers, APIs, Studio, Contributions, backfill, and import work.
> Last updated: 2026-07-07

## 1. Schema Status

Already applied:

- `catalog_edit_status` enum: `pending_review | applied | rejected | reverted | superseded`.
- `catalog_credits_dedupe_idx` uses `COALESCE(character_name, '')` to dedupe null character names correctly.
- `catalog_award_nominations` has a check requiring at least one of `title_id`, `person_id`, or `company_id`.
- `catalog_media_assets` and `catalog_external_ids` each have a partial unique index enforcing one `is_primary = true` row per entity/type or entity/provider.
- Hierarchy is canonical via `catalog_titles.parent_title_id`, `season_number`, and `episode_number`.
- `catalog_title_relations` no longer carries `season` or `episode` relation types. It is reserved for non-hierarchical relations only: `sequel`, `prequel`, `remake`, `spin_off`, `adaptation`, `alternate_version`, `compilation`, `related`.
- `catalog_genres` and `catalog_title_genres` join tables exist for Discover/search filtering. Genres are not stored only in `facts` JSONB.
- `catalog_revisions` has archive-tier columns:
  - `storage_tier`: `hot | archived`
  - `archive_object_key`
  - `archive_sha256`
  - `archived_at`
- Recent history stays in Postgres. Older `before_data` / `after_data` JSON can move to R2 later while a pointer stays in Postgres.
- `catalog_index_jobs` transactional outbox table exists.
- `catalog_index_jobs` rows are written in the same transaction as any `applied` or `reverted` mutation.
- Processed index jobs remain as an operational log, not pruned, because polling only scans `processed_at IS NULL`.
- Partial indexes:
  - `catalog_edits_pending_review_idx`, filtered to `status = 'pending_review'`
  - `catalog_index_jobs_unprocessed_idx`, filtered to `processed_at IS NULL`

## 2. Stage-Then-Apply Semantics

Pinned semantics:

- `pending_review`
  - Writes `catalog_edits`.
  - Writes proposed `catalog_revisions.after_data`.
  - Writes `catalog_sources`.
  - Does not touch current-state tables.
  - Is not indexed into search.

- `applied`
  - Current-state tables are mutated.
  - Revisions represent actual committed state.
  - Writes a `catalog_index_jobs` row in the same transaction.

- `rejected`
  - Pure status flip.
  - No revert edit.
  - No current-state mutation ever happened.

- `reverted`
  - Only valid from `applied`.
  - Creates a new `catalog_edits` row with `reverts_edit_id` set and `source = studio | system`.
  - Restores all `before_data` for every revision under the original edit in one transaction.
  - Marks original edit `reverted` and sets `reverted_by_edit_id`.
  - Writes a `catalog_index_jobs` row in the same transaction.

- `superseded`
  - A pending edit transitions here when a later applied edit changes at least one of the same fields on the same entity before the pending edit was approved.
  - Field-level overlap is required, not entity-level overlap.
  - Example: a pending edit changing `synopsis` is not superseded by an applied edit that only changed `runtime_minutes` on the same title.
  - No current-state mutation.
  - No revert needed.
  - Remains visible in history if `publicVisible = true`.

## 3. Trust/Risk Routing

V1 routing:

- Studio/team edits: `applied`.
- System backfill/import: `applied`, unless conflict is detected.
- Backfill/import conflict rule:
  - Input carries `sourceSnapshotAt`.
  - If target row `updated_at` is newer than `sourceSnapshotAt`, route to `pending_review` instead of overwriting a human edit.
- Any entity in the edit payload that is `locked_at` or otherwise high-risk makes the whole edit `pending_review`.
- Worst-case entity wins across all entities touched, not just the primary target.
- Public contributions: `pending_review` by default.
- Future trust scoring can use account age, accepted-edit history, and source quality to auto-apply low-risk fields.
- The helper must not hardcode assumptions that block future trust scoring.

## 4. Helper Function Shapes

```ts
stageCatalogEdit(input) -> CatalogEditMutationResult
```

Responsibilities:

- Validate payload.
- Compute target entity refs.
- Decide trust/risk across every touched entity. Worst-case wins.
- If `pending_review`, write edit/revisions/sources only. Do not mutate current-state tables.
- If trusted or auto-apply, call `applyCatalogEdit` logic inline in the same transaction.
- Idempotency: same `(actor_user_id, idempotency_key)` returns the existing edit.
- Retry/double-submit behavior: if an edit already exists for `(actor_user_id, idempotency_key)`, return `200` with `outcome: "existing"` regardless of whether the existing edit is still `pending_review` or has moved to `applied`, `rejected`, `reverted`, or `superseded`.
- Never leak unique constraint violations to the client.

```ts
applyCatalogEdit(editId)
```

Responsibilities:

- Internal operation used by the `/approve` endpoint. The public API name can be `approveCatalogEdit`, but it calls `applyCatalogEdit` internally.
- Lock all target rows in deterministic order.
- Use transaction-local lock timeout, for example `SET LOCAL lock_timeout = '2s'`.
- Lock timeout returns `409 CONFLICT`; client may retry.
- Verify edit is `pending_review`.
- Apply stored `after_data` to current-state tables.
- Mark edit `applied`.
- In the same transaction, find any other `pending_review` edits touching the same entity and overlapping at least one just-applied field, then mark those pending edits `superseded`.
- Write `catalog_index_jobs` row in the same transaction.

```ts
rejectCatalogEdit(editId)
```

Responsibilities:

- Lock edit row.
- Verify edit is `pending_review`.
- Mark edit `rejected`.
- No data-layer work.

```ts
revertCatalogEdit(editId)
```

Responsibilities:

- Lock edit and all affected current-state rows in deterministic order.
- Verify edit is `applied`.
- Restore all `before_data` across every revision under the edit in one transaction.
- Create a new `catalog_edits` row with `reverts_edit_id` set.
- Mark original edit `reverted` and set `reverted_by_edit_id`.
- Write `catalog_index_jobs` row in the same transaction.

```ts
mergeCatalogEntities(input)
```

Responsibilities:

- Handles title/person/company merge workflows when implemented.
- Uses the same edit/revision/source/outbox guarantees as other catalog mutations.
- Flattens merge chains at merge time. If `A -> B` and `B -> C`, rewrite `A -> C` so reads never chase a chain.
- Updates direct pointers to the final canonical entity in the same transaction as the merge edit.

```ts
batchStageCatalogEdits(inputs)
```

Use for backfill/import, not raw SQL.

Responsibilities:

- Same validation guarantees.
- Same audit/revision/source writes.
- Same idempotency guarantees.
- Same outbox writes.
- One lock set and one index-enqueue batch per N rows instead of per-row transactions.
- A single bad/conflicting row in a batch must not silently corrupt or partially apply the rest of the batch.
- This needs an explicit test.

## 5. Response Contract

Single DTO shape. Callers should not branch on internal backend path; they should read `edit.status`.

```ts
type CatalogEditDto = {
  id: string;
  status: "pending_review" | "applied" | "rejected" | "reverted" | "superseded";
  source: "studio" | "contribution" | "import" | "system";
  summary: string;
  publicVisible: boolean;
  createdAt: string;
  updatedAt: string;
};
```

For `stageCatalogEdit` only:

```ts
type CatalogEditMutationResult = {
  edit: CatalogEditDto;
  outcome: "created" | "applied" | "existing";
};
```

HTTP behavior:

- New pending edit: `201 { edit, outcome: "created" }`
- New trusted inline-applied edit: `201 { edit, outcome: "applied" }`
- Idempotency retry: `200 { edit, outcome: "existing" }`

Workflow endpoints:

```ts
approveCatalogEdit(editId) -> { edit: CatalogEditDto }
rejectCatalogEdit(editId) -> { edit: CatalogEditDto }
revertCatalogEdit(editId) -> { edit: CatalogEditDto }
```

No `outcome` wrapper for approve/reject/revert. `edit.status` is the only source of truth.
The `/approve` endpoint calls `applyCatalogEdit` internally.
Authorization for approve/reject/revert is enforced at the route/service boundary, not by the low-level mutation helper alone.

Client status copy:

- `pending_review`: "Submitted for review"
- `applied`: "Saved"
- `rejected`: "Rejected"
- `reverted`: "Reverted"
- `superseded`: "Superseded by a newer edit"

## 6. Known Risk Areas To Test

- Lock timeout under contention on a single hot title with many concurrent editors.
  - Confirm clean rollback.
  - Confirm release of any partial locks.
  - Confirm `409` surfaces.
- Index job writes must be in the same transaction as the current-state mutation in both `applyCatalogEdit` and `revertCatalogEdit`.
  - Never use a bare post-commit enqueue as the source of truth.
- Batched mutation path:
  - One conflicting row must not corrupt the batch.
  - One conflicting row must not partially apply the rest of the batch silently.
- Merge flattening:
  - `merged_into_title_id` chains such as `A -> B -> C` must be rewritten to point directly at the final canonical target at merge time.
  - Reads must never chase a merge chain.

## 7. Sequencing

1. Schema: done and typechecked.
2. Build the mutation helper with all semantics above baked in.
3. Add endpoints:
   - `/v1/catalog/titles`
   - `/v1/catalog/people`
   - `/v1/catalog/credits`
   - `/v1/catalog/media`
   - `/v1/catalog/edits/:id/approve`
   - `/v1/catalog/edits/:id/reject`
   - `/v1/catalog/edits/:id/revert`
   - `/v1/catalog/titles/:id/history`
4. Use one shared serializer/response contract from section 5.
5. Backfill current `films` to `catalog_titles` through the batched mutation path with `source = "system"` and the conflict rule from section 3.
6. Keep Studio catalog title UI on the mutation API and extend the same pattern to remaining Studio catalog/list surfaces.
7. Rewire Contributions to use the mutation API, with trust/risk deciding auto-apply vs review.
