# Feed Retention and High-Follower Cache

Last updated: 2026-06-22

This doc records the Phase 2 follow-up work for bounding `feed_items` growth and reducing Redis bypasses for home feeds that include high-follower accounts.

## Goals

- Keep `feed_items` bounded without breaking deep pagination.
- Preserve cursor pagination. No OFFSET.
- Avoid long-running deletes or rescore work on rows that are about to be pruned.
- Stop treating "viewer follows a high-follower account" as a full feed-cache bypass.
- Keep viewer-specific state live enough that likes, reposts, bookmarks, blocks, and mutes do not look stale after user actions.

## Retention

`feed_items` retention defaults to 30 days:

```env
FEED_ITEMS_RETENTION_DAYS=30
```

Reasoning: normal social feed consumption is heavily front-loaded. Most users do not paginate their home feed back 30 days, so keeping 30 days materialized covers ordinary behavior while preventing unbounded growth. Users who do go deeper are served by the cold path.

Retention is anchored on `feed_items.created_at`, not `posts.created_at`. This matters for follow-time backfill: when a user follows someone, old posts inserted into the follower's materialized feed get fresh `feed_items.created_at` values and remain available for a full retention window from the follow date.

## Prune Job

Worker job:

```txt
feed.pruneFeedItems
```

Defaults:

```env
FEED_ITEMS_PRUNE_INTERVAL_MINUTES=60
FEED_ITEMS_PRUNE_BATCH_SIZE=5000
FEED_ITEMS_PRUNE_MAX_BATCHES=20
```

Each run deletes at most 100k rows by default. Deletes are chunked through an indexed `(created_at, id)` range and use `for update skip locked`, so concurrent jobs do not block each other or hold large table locks.

The migration adds:

```sql
CREATE INDEX "feed_items_created_at_id_idx"
  ON "feed_items" USING btree ("created_at","id");
```

The job logs:

- retention days
- cutoff
- batch size
- max batches
- batches run
- pruned row count
- distinct touched viewers

It does not target-invalidate viewer feed caches. Feed payload TTL is 60 seconds; allowing a pruned row to linger in a cached page for up to 60 seconds is cheaper and simpler than issuing many Redis invalidation calls during every prune run.

## Rescore Coordination

`feed.rescore` uses:

- `feed_items.score_refreshed_at` to process least-recently-refreshed retained rows first
- `FEED_RESCORE_STALE_AFTER_MINUTES` to avoid rewriting rows whose score was refreshed recently
- the feed item retention cutoff so rows about to be pruned are not refreshed

This keeps score decay from leaving old materialized rows pinned at their original write-time score. If prune deletes rows while rescore is running, rescore updates by row ID and simply finds fewer rows; no correctness dependency exists between the jobs.

## Cold-Path Fallback

Authenticated home feed cursors include:

- score
- post ID
- ranking timestamp
- materialized retention anchor, when row came from `feed_items`

The retention anchor is `feed_items.created_at`, not `posts.created_at`. Live high-follower rows encode no retention anchor. This avoids accidentally switching to cold path for old-but-recently-backfilled posts or old live high-follower posts.

Cold path triggers only when the cursor's materialized retention anchor is at or before the retention boundary. For legacy score cursors without a retention anchor, the API falls back to a conservative score-threshold check.

Cold path behavior:

- bypasses final feed payload cache
- reads directly from `posts`
- includes viewer's own posts plus accepted followees
- applies normal visibility, profile access, block, and mute filters
- has no implicit post-age cutoff
- uses same score cursor ordering and merge shape

This path is expected to be rare and slower.

## Follow-Time Backfill

Follow-time backfill remains capped at `FOLLOW_BACKFILL_LIMIT=200` recent visible posts and still skips high-follower accounts. Because retention is based on `feed_items.created_at`, backfilled rows get a fresh 30-day retention window from follow time.

## High-Follower Author Cache

Before this change, authenticated feeds that followed any high-follower account bypassed Redis payload caching because high-follower posts were merged live at read time.

Now the read path splits data into two layers:

- Viewer-independent author slice: recent posts from high-follower author X, keyed by author ID.
- Viewer-specific response: followed high-follower author list, materialized `feed_items`, block/mute/profile access, and like/repost/bookmark flags.

Author cache defaults:

```env
FEED_HIGH_FOLLOWER_CACHE_TTL_SECONDS=45
FEED_HIGH_FOLLOWER_CACHE_POST_LIMIT=100
```

The 45-second TTL is short enough that engagement-driven score/counter changes do not remain stale for long, but long enough to share expensive author slices across many followers. A high-follower author cache can be up to TTL seconds stale. This is intentional.

The 100-row author slice supports ordinary feed pages. Deep pagination beyond the cached slice falls back to a direct per-author DB query for that page.

## Final Page Cache

High-follower mixed feeds now use normal final per-viewer feed payload caching unless cold retention fallback is active.

Layering:

- Author slice cache: 45 seconds.
- Final per-viewer feed page cache: 60 seconds.

Staleness does not compound for a served response: if final page cache hits, the API does not touch author cache. If final page cache misses, the author slice may be up to 45 seconds stale.

Expected bypass-rate impact:

- Before: any viewer following at least one high-follower account fully bypassed home feed Redis. A plausible active-user range is 30-70%, depending on follow graph.
- After: ordinary high-follower feeds use Redis. Full bypass should mostly be cold retention pages. Warm author slices should have very high hit rates for popular authors.

## Invalidation

Because final per-viewer pages are cached again, user actions that affect personal feed state must invalidate the viewer's feed cache.

Verified/patched invalidation coverage:

- Likes invalidate via `invalidatePostInteractionCaches`.
- Reposts invalidate the actor feed mutation path and source-post interaction caches.
- Bookmarks invalidate source-post interaction caches.
- Blocks invalidate both involved users and purge affected feed items.
- Mutes and unmutes invalidate the acting viewer's feed cache.
- Follows/unfollows invalidate the acting viewer and affected author/profile caches.
- Feed fanout and rescore still use shared viewer cache invalidation.
- Prune intentionally does not use targeted viewer invalidation.

## Tradeoffs

- Prune may leave a cached removed row visible for up to 60 seconds. Accepted.
- High-follower author data may be up to 45 seconds stale. Accepted.
- Final per-viewer high-follower pages may be up to 60 seconds stale unless invalidated by user actions. Interaction/block/mute/follow paths now invalidate relevant viewer caches.
- Deep high-follower pagination beyond cached author slice may hit DB. Expected rare.

## Verification

Commands run:

```bash
pnpm --filter @35mm/api test -- homeFeedMerge.test.ts
pnpm --filter @35mm/api typecheck
pnpm --filter @35mm/worker typecheck
pnpm typecheck
git diff --check
```

Relevant tests cover:

- merge ordering and dedupe
- retention config parsing
- cold-path trigger using materialized retention anchor
- live rows without retention anchor not forcing cold path
- retained backfilled old posts not forcing cold path
- legacy cursor fallback
- high-follower cache TTL/post-limit parsing
- author-cache score ranking and cursor filtering
