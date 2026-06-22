# @35mm/worker

Long-running BullMQ worker for async jobs.

## Run worker daemon

```bash
pnpm --filter @35mm/worker dev
```

Required env (loaded from `apps/api/.env` by default):

- `DATABASE_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`
- `UPSTASH_REDIS_URL`
- `FEED_HIGH_FOLLOWER_THRESHOLD` (optional; default `10000`)
- `FEED_FANOUT_BATCH_SIZE` (optional; default `500`, max `2000`)
- `FEED_RESCORE_MAX_AGE_HOURS` (optional; default `72`)
- `FEED_RESCORE_BATCH_SIZE` (optional; default `500`, max `2000`)

Worker queue name: `35mm-jobs`

Current job handlers:

- `media.process` (real): generate `thumb/feed/full` variants + blurhash
- `feed.fanout` (real): chunked accepted-follower `feed_items` writes below high-follower threshold
- `feed.rescore` (real): periodic recent `feed_items.score` refresh from denormalized post counters
- `counter.increment` (real): batched denormalized counter deltas
- `notification.digest` (stub)

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
