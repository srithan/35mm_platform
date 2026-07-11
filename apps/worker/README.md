# @35mm/worker

Long-running BullMQ worker for async jobs.

## Run worker daemon

```bash
pnpm --filter @35mm/worker dev
```

Root `pnpm dev` intentionally runs only web + API so local sessions do not idle-poll shared Upstash Redis. Use `pnpm dev:all` or `pnpm dev:worker` only when you need BullMQ jobs locally.

To hard-disable the daemon before it opens Redis connections:

```env
WORKER_ENABLED=false
```

Required env:

- Local `pnpm --filter @35mm/worker ...` scripts currently load `apps/api/.env` by default.
- `apps/worker/.env.example` lists the worker-specific variables if you run the worker with a worker-local env file or deploy it separately.

- `DATABASE_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`
- `QUEUE_REDIS_URL` (or queue REST URL/token pair; must match API; worker never falls back to cache Redis)
- `UPSTASH_REDIS_URL`
- `WORKER_ENABLED` (optional; default `true`; set `false` to avoid BullMQ polling in local quota-sensitive runs)
- `ABLY_API_KEY` (required for realtime notification/chat publish)
- `FEED_HIGH_FOLLOWER_THRESHOLD` (optional; default `10000`)
- `FEED_FANOUT_BATCH_SIZE` (optional; default `500`, max `2000`)
- `FEED_RESCORE_MAX_AGE_HOURS` (optional; default `72`)
- `FEED_RESCORE_BATCH_SIZE` (optional; default `500`, max `2000`)

Worker queue name: `35mm-jobs`

Current job handlers:

- `media.process` (real): generate `thumb/feed/full` variants + blurhash
- `feed.fanout` (real): chunked accepted-follower `feed_items` writes below high-follower threshold
- `feed.rescore` (real): periodic stale `feed_items.score` refresh from denormalized post counters, ordered by `score_refreshed_at`
- `counter.increment` (real): batched denormalized counter deltas
- `chat.deliver` (real): fallback/asynchronous publish for new chat messages and inbox badge updates when API direct publish fails or fanout is too large
- `chat.messageUpdated` (real): publish chat edit/delete/reaction events
- `chat.readReceipt` (real): fallback publish for read receipts when API direct publish fails
- `chat.typing` (real): fallback publish for ephemeral typing state when API direct publish fails
- `notification.digest` (stub)

### Chat Channels (Ably)

- `thread:{threadId}`: per-thread events `message.new`, `message.edited`, `message.deleted`, `message.reaction`, `message.read`, `typing.update`.
- `user:{userId}:inbox`: per-user inbox badge event `thread.updated`.

### Keyspaces (AWS)

- Worker connects to AWS Keyspaces for chat message reads in deliver/update jobs.
- Uses the same `cassandra-driver` singleton pattern as the API.
- If `KEYSPACES_ENDPOINT` / `AWS_REGION` are absent, jobs log a warning and skip the Keyspaces read. Ably publish is skipped because no message payload can be delivered.

## Media backfill

Run idempotent backfill over historical posts:

```bash
pnpm --filter @35mm/worker backfill:media
```

Optional flags:

```bash
pnpm --filter @35mm/worker backfill:media -- --dry-run
pnpm --filter @35mm/worker backfill:media -- --limit 200
pnpm --filter @35mm/worker backfill:media -- --dry-run --limit 200
```

Notes:

- Cursor-based scan (`created_at desc, id desc`)
- Idempotent: already-processed media rows skipped
- `--dry-run` scans and reports candidates without writing changes

## Profile media backfill

Run idempotent backfill over historical avatar and cover uploads:

```bash
pnpm --filter @35mm/worker backfill:avatars
```

Optional flags:

```bash
pnpm --filter @35mm/worker backfill:avatars -- --dry-run
pnpm --filter @35mm/worker backfill:avatars -- --kind avatar
pnpm --filter @35mm/worker backfill:avatars -- --kind cover
pnpm --filter @35mm/worker backfill:avatars -- --limit 200
```

Notes:

- Cursor-based scan (`created_at desc, id desc`)
- Idempotent: rows with existing variant JSON are skipped
- Writes WebP variants to R2 and stores stable public URLs on `profiles`
