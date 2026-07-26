# Search

35mm site-header search is server-mediated Meilisearch over canonical films,
profiles, and public posts.

## Runtime path

1. Web debounces input for 300 ms and calls authenticated `GET /v1/search`.
2. API sends one Meilisearch `/multi-search` request against
   `films`, `users`, and `posts`.
3. Meilisearch returns candidate IDs only.
4. API batch-hydrates those candidates from Postgres and rechecks account,
   moderation, block, mute, post visibility, deletion, repost, and NSFW state.
5. API returns a bounded mixed result set. Film links use canonical `films.id`
   values; `/v1/films/:id` resolves optional TMDB metadata for the existing
   title presentation layer.

No browser or mobile client receives a Meilisearch key.

## Index delivery

Migration `0055_search_index_outbox.sql` installs lightweight row triggers for
search-relevant changes to `films`, `profiles`, `posts`, and `users.status`.
Triggers append `search_index_jobs` inside the source mutation transaction.
They do not call Meilisearch.

Worker `search.index.outbox` claims at most
`SEARCH_INDEX_OUTBOX_BATCH_SIZE` rows with `FOR UPDATE SKIP LOCKED`, coalesces
duplicate entity references, and enqueues one retryable `search.index` batch.
The index job performs at most one source query per entity type, sends
idempotent document replacements/deletions, and waits for every asynchronous
Meilisearch task. Failed Meilisearch tasks throw so BullMQ retry policy applies.

Only public, visible, non-deleted, non-repost, non-flagged posts from active,
visible authors are indexed. Query-time Postgres hydration repeats visibility
checks because search indexes are secondary, eventually consistent projections.

## Index setup

Use a short-lived admin key with `indexes.create`, `indexes.get`,
`settings.update`, and `tasks.get`:

```bash
MEILISEARCH_ADMIN_API_KEY=<admin-key> pnpm --filter @35mm/worker search:setup
```

Do not save `MEILISEARCH_ADMIN_API_KEY` in application deployment settings.

Worker key:

- actions: `documents.add`, `documents.delete`, `indexes.get`, `tasks.get`
- indexes: `films`, `users`, `posts`

API search key:

- actions: `search`
- indexes: `films`, `users`, `posts`

Application variables:

```env
MEILISEARCH_HOST=https://your-meilisearch-service.onrender.com
MEILISEARCH_API_KEY=<worker-write-key>
MEILISEARCH_SEARCH_API_KEY=<api-search-only-key>
MEILISEARCH_REQUEST_TIMEOUT_MS=3000
MEILISEARCH_TASK_TIMEOUT_MS=30000
SEARCH_INDEX_OUTBOX_INTERVAL_SECONDS=5
SEARCH_INDEX_OUTBOX_BATCH_SIZE=500
```

## Initial and resumable backfill

Apply database migration and configure indexes first. Backfill uses primary-key
cursor scans, never `OFFSET`, and processes bounded batches:

```bash
pnpm --filter @35mm/worker search:backfill -- --type=all --batch-size=500
```

Resume one entity type after its last logged cursor:

```bash
pnpm --filter @35mm/worker search:backfill -- --type=post --batch-size=500 --after=<last-id>
```

## Scale assumptions

At 1M+ DAU, typeahead produces one Meilisearch multi-index read after debounce,
then three bounded Postgres primary-key hydration queries. No `COUNT`, `OFFSET`,
or unbounded scan occurs on the request path. Writes add one small outbox row
only when searchable fields change; counter-only post updates do not enqueue
search work. Backfill is cursor-bounded and operationally resumable.

Search does not use Redis response caching because results are user-sensitive
through block/mute enforcement and Meilisearch already owns retrieval latency.
Index invalidation is explicit through source-table triggers and idempotent
worker replacement/deletion.
