# Films To Catalog Titles Backfill

Script:

```bash
pnpm --filter @35mm/api backfill:catalog-films
```

## Behavior

- Reads `films` in ascending `films.id` cursor pages.
- Calls `batchStageCatalogEdits` with `source = "system"`; no raw catalog writes.
- Writes title operations into `catalog_titles` with `id = films.id` and `legacyFilmId = films.id`.
- Carries title, original title, year, runtime, overview, language, country, genres, verification, and TMDB source URL where available.
- Uses `sourceSnapshotAt = films.updated_at`, so later conflicting human edits route to review when the helper receives update-style inputs.
- Each applied row writes revisions/sources and a `catalog_index_jobs` row inside the same transaction.

## Chunk Size

Default chunk size: `100`.

Reasoning:

- Catalog writes are lower-volume than reads but each row writes edit, revision, optional source, current title, and outbox records.
- A chunk of 100 amortizes transaction overhead and index enqueue work without holding many row locks for long periods.
- The script clamps `CATALOG_FILMS_BACKFILL_CHUNK_SIZE` to `10..500`.
- Reads are cursor-based by `films.id`; no OFFSET scans.

## Idempotency

Idempotency key format:

```txt
films-to-catalog:<filmId>
```

System actor is null, so the helper uses transaction advisory locks around the idempotency key before insert. Retries return existing edits safely.

## Failure Handling

`batchStageCatalogEdits` is bounded-atomic by chunk. If one row conflicts in a chunk, the transaction rolls back and diagnostics are returned/logged for every row in that chunk. No silent partial apply occurs.

## Operational Notes

- Run with worker enabled so `catalog.index.outbox` can relay index jobs.
- If duplicate slugs or existing catalog rows cause chunk failures, inspect logged diagnostics and rerun after resolving inputs.
- Use staging first and compare row counts between `films` and `catalog_titles.legacy_film_id`.
