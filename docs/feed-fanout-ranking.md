# Feed Fanout and Ranking

> Dedicated implementation note for the async feed fanout and score-based home feed ranking work completed in this chat.

## Scope

This work changed home feed fanout and ranking only.

It did not change film identity rules, API contracts for post payload shape, interaction fact tables, or Phase 1 counter behavior beyond reading denormalized post counters for feed scoring.

## Previous State

Before this work:

- Authenticated `GET /v1/feed` read only materialized `feed_items` joined to `posts`.
- Guest `GET /v1/feed` read live from `posts`.
- Post create and repost create synchronously inserted `feed_items` for the author and all accepted followers.
- Follow creation backfilled up to 200 recent non-private posts into the new follower's `feed_items`.
- `apps/worker/src/jobs/feedFanout.ts` was a readiness log stub.
- `feed_items.score` existed but was unused.

## Step 1: Fanout-On-Write

New post/repost write flow:

1. API creates the `posts` row.
2. API writes only the author's own `feed_items` row synchronously when the post should enter feeds.
3. API enqueues `feed.fanout` with `{ postId, authorUserId }`.
4. Worker reads the post and accepted follower count.
5. Worker skips private/deleted posts.
6. Worker skips high-follower authors.
7. Worker paginates accepted followers and inserts follower `feed_items` in chunks.
8. Worker invalidates viewer feed caches for each written chunk.

High-follower behavior:

- Default threshold: `10000`.
- Env override: `FEED_HIGH_FOLLOWER_THRESHOLD`.
- Authors with accepted follower count `>= threshold` skip write fanout.
- Their posts are merged live into followed viewers' home feed read path.

Fanout batching:

- Default batch size: `500`.
- Env override: `FEED_FANOUT_BATCH_SIZE`.
- Worker cap: `2000`.
- Pagination uses `(follows.created_at, follows.follower_id)`.
- No OFFSET pagination.

Follow-time backfill:

- Normal public accounts still backfill up to 200 recent visible posts.
- High-follower accounts skip backfill because live merge handles their history.
- Private follow requests keep existing behavior: no immediate backfill on pending request.

## Step 2: Scoring

Home feed score uses denormalized post counters from `posts`.

Formula:

```txt
score =
  1000 * exp(-ageHours / 36)
  + 120 * ln(1 + likes + comments*3 + reposts*4)
```

Where:

- `ageHours`: hours since `posts.created_at`.
- `likes`: `posts.like_count`.
- `comments`: `posts.comment_count`.
- `reposts`: `posts.repost_count`.

Design intent:

- Fresh posts get a strong baseline.
- Score decays smoothly with age.
- Comments and reposts carry more weight than likes.
- Log engagement lets popular posts rise without letting raw large-account volume dominate forever.

Shared implementation lives in:

- `packages/types/src/feedScoring.ts`

SQL mirror lives in:

- `apps/api/src/modules/feed/routes.ts`

## Score Write Points

`feed_items.score` is computed when feed rows are written:

- author self row on post create
- author self row on repost create
- follow-time backfill rows
- worker fanout rows

High-follower live rows do not have `feed_items` rows. They compute the same score in SQL during read, using the same formula and denormalized post counters.

## Rescoring

`feed.rescore` was added as a worker job.

Purpose:

- Refresh recent materialized `feed_items.score` after async `counter.increment` jobs update post counters.
- Avoid recomputing materialized feed scores on every read.

Defaults:

- `FEED_RESCORE_MAX_AGE_HOURS=72`
- `FEED_RESCORE_BATCH_SIZE=500`
- Batch cap: `2000`

Operational expectation:

- Schedule `feed.rescore` periodically outside request flow, for example every few minutes.
- The worker handler exists; deploy/cron scheduling is separate infrastructure work.

## Home Feed Read Path

Authenticated home feed now:

1. Finds high-follower authors followed by the viewer.
2. Reads materialized rows from `feed_items`, excluding those high-follower authors.
3. Reads live rows from `posts` for followed high-follower authors.
4. Sorts both sources by score descending, then post ID descending.
5. Dedupes by post ID.
6. Returns one cursor-paginated page.

Materialized rows use:

```txt
coalesce(feed_items.score, live_formula_score)
```

The fallback protects older rows that predate score population.

Guest feed stays chronological from `posts`.

Profile, bookmark, and comment pagination keep their existing chronological cursor behavior.

## Cursor Behavior

Authenticated home feed cursor encodes:

- `score`
- `id`
- `asOf`

`asOf` freezes formula-based score calculation across a pagination session, preventing live high-follower rows from drifting between page requests because of recency decay.

Ordering:

```txt
score DESC, post_id DESC
```

Cursor filter:

```txt
score < cursor.score
OR (score = cursor.score AND post_id < cursor.id)
```

No OFFSET pagination was introduced.

## Cache Behavior

Materialized-only authenticated home feeds:

- Use existing Redis feed page cache.
- Cache key includes viewer, cursor, and limit.
- Worker fanout/rescore invalidates touched viewer indexes.

High-follower live-merge feeds:

- Bypass Redis payload cache in this implementation.
- Reason: invalidating every follower cache for a high-follower author defeats the fanout exception.

Guest/profile cache behavior was not changed by this work.

## Database Changes

Schema updates in `packages/db/src/schema/social.ts`:

- `feed_items_user_post_idx`: unique `(user_id, post_id)`.
- `feed_items_user_score_post_idx`: `(user_id, score, post_id)`.
- `follows_following_status_created_follower_idx`: `(following_id, status, created_at, follower_id)`.

Migration:

- `packages/db/drizzle/0014_feed_fanout_indexes.sql`

Migration behavior:

- Deletes duplicate `feed_items` rows before adding the unique index.
- Keeps the newest duplicate row by `(created_at, id)`.

## Worker Jobs

Implemented or changed:

- `feed.fanout`
- `feed.rescore`

Existing Phase 1 counter job remains:

- `counter.increment`

Queue name:

```txt
35mm-jobs
```

## Environment Variables

```env
FEED_HIGH_FOLLOWER_THRESHOLD=10000
FEED_FANOUT_BATCH_SIZE=500
FEED_RESCORE_MAX_AGE_HOURS=72
FEED_RESCORE_BATCH_SIZE=500
```

Related existing vars:

```env
UPSTASH_REDIS_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
COUNTER_BATCH_WINDOW_MS=50
```

## Files Added

- `apps/api/src/modules/feed/fanoutConfig.ts`
- `apps/api/src/modules/feed/homeFeedMerge.test.ts`
- `apps/worker/src/jobs/feedRescore.ts`
- `apps/worker/src/lib/feedCache.ts`
- `packages/db/drizzle/0014_feed_fanout_indexes.sql`
- `packages/types/src/feedScoring.ts`

## Files Updated

- `apps/api/src/lib/feedCache.ts`
- `apps/api/src/lib/jobs.ts`
- `apps/api/src/modules/feed/routes.ts`
- `apps/api/src/modules/follows/routes.ts`
- `apps/worker/README.md`
- `apps/worker/src/index.ts`
- `apps/worker/src/jobs/feedFanout.ts`
- `apps/worker/src/lib/env.ts`
- `apps/worker/src/lib/env.js`
- `apps/worker/src/lib/env.d.ts`
- `apps/worker/src/lib/queue.ts`
- `codebase-analysis-docs/CODEBASE_KNOWLEDGE.md`
- `docs/architecture.md`
- `packages/db/drizzle/meta/_journal.json`
- `packages/db/src/schema/social.ts`
- `packages/types/src/index.ts`

## Tests and Verification

Commands run:

```bash
pnpm --filter @35mm/api test
pnpm typecheck
```

Result:

- API tests passed: 12 passed, 1 skipped.
- Root typecheck passed.

Test coverage added:

- materialized/live merge ordering
- duplicate post dedupe
- pagination `hasMore`
- high-follower threshold parsing
- scoring formula behavior

## Operational Notes

- `feed.fanout` job throughput scales by follower chunks, not one giant transaction.
- High-follower accounts avoid write amplification and shift cost to read-time live merge.
- `feed.rescore` should run periodically after async counters settle.
- Existing rows with null `feed_items.score` still rank through SQL fallback until rescored.
- The high-follower classification currently counts accepted followers when needed; a denormalized follower count could reduce that cost later.

## Not Included

Not implemented in this chat:

- Deploy scheduler for recurring `feed.rescore`.
- Denormalized follower count columns.
- Meilisearch/search indexing.
- Notification digest.
- Any change to film identity or TMDB rules.
