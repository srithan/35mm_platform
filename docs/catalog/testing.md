# Catalog Testing

## Commands

```bash
pnpm --filter @35mm/validators typecheck
pnpm --filter @35mm/types typecheck
pnpm --filter @35mm/api typecheck
pnpm --filter @35mm/api test
pnpm --filter @35mm/worker typecheck
```

Real Postgres contention tests:

```bash
RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/catalog/mutations.test.ts
```

This requires `DATABASE_URL` pointing at a migrated database with catalog tables from `0038_catalog_core.sql`.

## Coverage

Always-on unit coverage in `apps/api/src/modules/catalog/mutations.test.ts`:

- Changed-field extraction stays field-level, preventing entity-only supersede behavior.
- Entity refs are deduped and sorted for deterministic lock ordering.

DB-backed coverage, gated by `RUN_CATALOG_DB_TESTS=1`:

- Lock-timeout rollback: one transaction holds a title row lock, `applyCatalogEdit` returns `409`, edit stays `pending_review`, and no outbox row is created.
- Transactional outbox behavior: apply changes current state and writes outbox; revert restores state.
- Pre-commit outbox failure: a test hook throws after current-state writes and before index outbox insert; transaction rollback leaves title state, edit status, and outbox unchanged.
- Batch atomicity: duplicate slug conflict in a two-row chunk rolls back both rows and reports diagnostics for both.
- Concurrency: multiple pending edits on one title are applied concurrently; deterministic locking/status transitions prevent corruption.
- Merge flattening: an existing `A -> B` merge chain followed by merging `B -> C` rewrites both `A` and `B` to point directly to `C`.

## Test Data Safety

DB tests create ULID-scoped titles and clean by `summary`/title prefixes after the suite. Run against disposable or staging databases only.

## Latest Local Run

Default suite:

```bash
pnpm --filter @35mm/api test
```

Passed on 2026-07-07: 46 passed, 7 skipped.

DB-gated suite was attempted on 2026-07-07 and reached the configured Neon database, but failed before exercising catalog behavior because the target database did not have catalog tables:

```txt
relation "catalog_edits" does not exist
```

No migration was applied to that database during testing.

## Remaining Verification

- Run `RUN_CATALOG_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/catalog/mutations.test.ts` against a migrated catalog database.
- Search indexing cannot be end-to-end tested until Meilisearch configuration and document mapping exist.
- Load tests for dozens of simultaneous editors on one title remain an operational test, not a Vitest unit suite.
