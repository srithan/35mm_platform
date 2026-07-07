# Catalog Documentation

This directory is the living documentation home for the 35mm catalog database and mutation layer: schema, edit semantics, helper implementation, REST APIs, backfill, Studio rewiring, Contributions rewiring, imports, search/indexing, and future catalog operations.

The catalog is the IMDb-like database for titles, people, companies, credits, awards, media, sources, public revision history, and rollback. It is separate from the current social `films` bridge table, which remains in use by posts, lists, watchlists, onboarding, and profile stats until migration work is complete.

## Read Order

1. Read `spec.md` first. It is the plan and contract for the mutation layer.
2. Read `implementation.md` once the helper exists. It records what was actually built and any deviations from the spec.
3. Read `api-reference.md` when implementing clients or endpoint integrations.
4. Read `testing.md` before changing mutation logic, concurrency behavior, outbox behavior, or batch imports.
5. Read `backfill.md` before running or debugging the `films` to `catalog_titles` migration.

## Files

- [`spec.md`](./spec.md): Frozen spec-of-record for schema status, stage-then-apply semantics, trust/risk routing, helper shapes, response contracts, known risk areas, and sequencing.
- [`implementation.md`](./implementation.md): Implemented helper signatures, file locations, transaction/observability behavior, and real deviations from `spec.md`.
- [`api-reference.md`](./api-reference.md): Catalog endpoint request/response examples, status codes, error shapes, and auth requirements.
- [`testing.md`](./testing.md): Coverage for lock-timeout rollback, transactional outbox behavior, batch conflict handling, merge flattening, and pass/fail status.
- [`backfill.md`](./backfill.md): `films` to `catalog_titles` migration runner, chunk sizing, conflict behavior, and operational notes.

## Documentation Rule

`spec.md` is the stable plan and should rarely change once implementation starts. If implementation reality diverges from the spec in a meaningful way, document the divergence in `implementation.md` with reasoning instead of silently editing `spec.md`.

Every future catalog-related change gets its own file in this directory and a link in this README when created. Examples: Studio rewire, Contributions rewire, Letterboxd import, genre/date precision work, orphan reconciliation, search indexing, moderation tooling, and revision archiving.
