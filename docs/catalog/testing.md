# Catalog Testing

## Commands

```bash
pnpm --filter @35mm/validators typecheck
pnpm --filter @35mm/types typecheck
pnpm --filter @35mm/api typecheck
pnpm --filter @35mm/api test
pnpm --filter @35mm/worker typecheck
```

Real Postgres catalog DB suites:

```bash
RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/catalog/mutations.test.ts
RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/catalog/read.db.test.ts
RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/catalog/workflow.db.test.ts
```

This requires `DATABASE_URL` pointing at a migrated database with catalog tables from `0038_catalog_core.sql`.
The pnpm script passes the file argument through to `vitest run`; with the current Vitest setup this still discovers the whole API test suite, while `RUN_CATALOG_DB_TESTS=1` enables the catalog DB cases.

## Coverage

Always-on route/read coverage in `apps/api/src/modules/catalog/routes.test.ts`:

- Opaque catalog read cursor encode/decode round-trip.
- Invalid cursor decode rejection.
- Query limit cap enforcement at 100.
- Mutation route idempotency-key requirement.
- Public/studio route source derivation ignores client-supplied `source`.
- Static guard that new catalog route/read sources do not use `OFFSET`.

Always-on unit coverage in `apps/api/src/modules/catalog/mutations.test.ts`:

- Changed-field extraction stays field-level, preventing entity-only supersede behavior.
- Entity refs are deduped and sorted for deterministic lock ordering.

DB-backed coverage, gated by `RUN_CATALOG_DB_TESTS=1`:

- Public read route behavior over real Postgres in `apps/api/src/modules/catalog/read.db.test.ts`: seeded title/person/company/media/external ID/alias/credit/relation/award/history rows are read through Hono `/v1/catalog` routes.
- Active-only filtering: title/person/company search, media, external IDs, credits with inactive joins, relations to inactive titles, awards with inactive award definitions, and company title rows with inactive titles.
- Detail serialization: title, person, company, primary media, external IDs, merged title/person/company canonical targets, aliases, relations, awards, and company title payloads.
- Cursor behavior: stable title pagination across pages and malformed cursor `400`.
- Public history: non-public edits and non-public revisions are hidden from unauthenticated history routes.
- Query-plan guard: synthetic 5,000-row title/person/company/search support tables are analyzed, then representative `EXPLAIN (FORMAT JSON)` queries assert no sequential scan on hot catalog relations and assert expected indexes for search, external lookup, media, credits, aliases, relations, company-title lists, and history.
- Lock-timeout rollback: one transaction holds a title row lock, `applyCatalogEdit` returns `409`, edit stays `pending_review`, and no outbox row is created.
- Transactional outbox behavior: apply changes current state and writes outbox; revert restores state.
- Pre-commit outbox failure: a test hook throws after current-state writes and before index outbox insert; transaction rollback leaves title state, edit status, and outbox unchanged.
- Batch atomicity: duplicate slug conflict in a two-row chunk rolls back both rows and reports diagnostics for both.
- Concurrency: multiple pending edits on one title are applied concurrently; deterministic locking/status transitions prevent corruption.
- Merge flattening: an existing `A -> B` merge chain followed by merging `B -> C` rewrites both `A` and `B` to point directly to `C`.
- `title_genre` lifecycle: create, update, hard delete, revert update, revert delete, and revert create are validated against real Postgres rows.
- HTTP moderation workflow: contribution route staging, Studio approval, public read visibility, revert, and reject are tested through Hono `/v1/catalog` routes with a real DB actor row.

## Test Data Safety

DB tests create ULID-scoped catalog fixtures and clean by synthetic IDs, slugs, summaries, and prefixes after the suite. The read plan suite seeds thousands of rows in catalog tables. Run against disposable or staging databases only.

## Latest Local Run

Default suite:

```bash
pnpm --filter @35mm/api test
```

Passed on 2026-07-08: 51 passed, 16 skipped.

DB-gated command:

```bash
RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/catalog/mutations.test.ts
RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/catalog/read.db.test.ts
RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/catalog/workflow.db.test.ts
```

Passed on 2026-07-08 against the configured migrated Neon database:

```bash
RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test src/modules/catalog/mutations.test.ts src/modules/catalog/read.db.test.ts src/modules/catalog/workflow.db.test.ts
```

Result: 17/17 catalog DB tests passed. Default API suite passed 51 tests with DB-gated tests skipped.

## Remaining Verification

- Apply `packages/db/drizzle/0039_catalog_api_read_indexes.sql`, `packages/db/drizzle/0040_catalog_title_genre_entity.sql`, and `packages/db/drizzle/0041_catalog_title_genre_updated_at.sql` in deployed databases before high-volume catalog read traffic or title-genre mutation traffic.
- Search indexing cannot be end-to-end tested until Meilisearch configuration and document mapping exist.
- Load tests for dozens of simultaneous editors on one title remain an operational test, not a Vitest unit suite.
- DB-backed route, workflow, and plan tests should run in CI/staging against every migrated Postgres environment before launch.
