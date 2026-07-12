# Content Moderation Implementation

> Built from `docs/moderation/spec.md` through staged implementation completed 2026-07-11.

## Files

Schema and migrations:

- `packages/db/src/schema/moderation.ts`
- `packages/db/src/schema/posts.ts`
- `packages/db/src/schema/social.ts`
- `packages/db/src/schema/profiles.ts`
- `packages/db/src/schema/users.ts`
- `packages/db/drizzle/0043_content_moderation.sql`
- `packages/db/drizzle/0044_moderation_enforcement_support.sql`
- `packages/db/drizzle/0045_moderation_read_status.sql`
- `packages/db/drizzle/0046_moderation_notifications.sql`

API:

- `apps/api/src/modules/moderation/routes.ts`
- `apps/api/src/modules/moderation/reports.ts`
- `apps/api/src/modules/moderation/adminReadService.ts`
- `apps/api/src/modules/moderation/actions.ts`
- `apps/api/src/modules/moderation/target.ts`
- `apps/api/src/modules/moderation/serializer.ts`
- `apps/api/src/lib/moderationRead.ts`
- `apps/api/src/lib/studioAuth.ts`

Worker and notifications:

- `apps/worker/src/jobs/moderationAutoHide.ts`
- `apps/worker/src/jobs/moderationNotifyReporters.ts`
- `apps/worker/src/lib/notificationService.ts`
- `packages/db/src/notificationService.ts`
- `apps/worker/src/jobs/notificationPublish.ts`
- `apps/worker/src/jobs/notificationEmail.ts`

Contracts:

- `packages/types/src/index.ts`
- `packages/validators/src/index.ts`

## Schema And Indexes

`reports` stores server snapshots, reporter/target/reason/status, resolution action, and timestamps. Partial unique `reports_unresolved_reporter_content_idx` enforces one open/reviewing report per reporter/target. Content, queue, and reporter-history cursor indexes support bounded reads.

`moderation_actions` stores append-only decisions. `subject_user_id` was added for indexed user strike/action history. Unique `(actor_user_id, idempotency_key)` protects staff retries.

`moderation_content_state` stores grouped status/count/timestamps. Queue ordering index starts with report count and last report time.

`moderation_notification_outbox` stores one durable action intent plus `report_cursor`, lock/retry fields, and processed state.

Hot target tables carry `moderation_status`:

- `posts(moderation_status, created_at, id)`
- `comments(post_id, moderation_status, created_at, id)`
- `profiles(moderation_status, username, user_id)`

`profiles.strike_count` is nonnegative and denormalized.

Notifications gained JSONB metadata and nullable unique `source_key`. Account status gained `banned` so ban is distinct from suspension.

## Report Creation

`createReport` captures target snapshot and inserts report inside pooled transaction. Conflict does not increment report count; helper fetches existing unresolved row and returns it. New report upserts state count and then queues deterministic per-report automatic-hide work.

Public `ReportDto` excludes snapshot, reporter identity, and resolution internals. Caller history is ordered by `(created_at, id)` descending.

## Staff Enforcement

`applyModerationAction` and `dismissModerationContent` use:

1. Transaction-local two-second lock timeout.
2. Advisory lock over actor/idempotency key.
3. Existing-action lookup.
4. Target resolution and unresolved-report locking.
5. Moderation-state row lock.
6. Append-only action insert.
7. State/target/profile/account/strike updates.
8. Bulk report resolution.
9. Durable notification outbox insert.

Post-commit cache status synchronization is retryable through idempotent action lookup. Cache failure returns `503 MODERATION_CACHE_SYNC_UNAVAILABLE` after committed enforcement; repeating same key repairs side effects without another strike/action/outbox row.

Suspension sets account `suspended` plus profile moderation `hidden`. Ban sets account `banned` plus profile moderation `removed`. Profile status filters all authored public post/comment reads without bulk-updating every authored row.

## Read Path

Direct feed, detail, bookmark, profile-feed, comment, profile search/detail/stats, follower, and following queries add denormalized status predicates alongside privacy/block/mute/deletion predicates.

Cached feed payloads perform one Redis `MGET` for each page's post/profile keys. Verification failure discards cache. Staff high-follower reads bypass shared slices. Profile-stats enforcement writes a 180-second dirty guard, longer than stats cache TTL, so invalidation failure cannot serve stale moderated aggregates.

Responses expose `moderationStatus` to author/staff clients. Rich mention hydration treats moderated profiles as unavailable.

## Worker Behavior

`moderation.autoHideCheck`:

- Validates payload.
- Locks state.
- Uses total count as fast gate.
- Reads at most threshold recent unresolved reports.
- Reads denormalized follower count.
- Writes system action and hide transactionally.
- Synchronizes status/dirty keys and invalidates caches.
- Creates idempotent under-review notification.

`moderation.notifyReporters`:

- Runs from API wake jobs and repeat schedule.
- Claims up to ten outbox actions with `SKIP LOCKED`.
- Reclaims stale five-minute processing locks.
- Creates one idempotent author notification.
- Creates reporter notifications in configurable batches, default 500.
- Advances ULID report cursor without `OFFSET`.
- Publishes notification jobs through BullMQ `addBulk`.
- Uses capped exponential retry and permanent `failed` state after 12 attempts.

## Notification Reuse

Original notification creation logic moved into `@35mm/db/notification-service` and is bound by both API and worker. Existing API import `createNotification` remains unchanged for callers. Social bundling/preferences/block/mute checks remain in shared service; moderation batch creation is restricted to moderation types.

Ably publishes metadata on `user:{recipientId}:notifications`. Resend uses same email renderer, cooldown, unsubscribe token, and preference JSON. Web realtime/list/dropdown copy supports all three moderation types.

## Scale Assumptions

- Reporting volume scales per user and target through unique/indexed O(1) writes.
- Review reads start from denormalized grouped state instead of global report grouping.
- Detail histories are independently cursor-paginated.
- Automatic threshold probe is capped by threshold.
- Reporter fanout is asynchronous, cursor-batched, and bulk-enqueued.
- Profile-level suspend/ban avoids unbounded authored-content updates.

## Divergences And Gaps

- Admin content detail does not return unbounded “all reports/actions.” Each history is independently cursor-paginated to remain safe under brigading.
- Hot read enforcement uses denormalized target columns plus Redis status verification instead of joining `moderation_content_state` on every feed row.
- Notification metadata/source keys and outbox report cursor were added because vague/specific copy and retry-safe batching cannot be represented by original notification columns alone.
- Chat-message and list reporting remain outside V1.
- Strike-based automatic suspension/ban suggestions remain outside V1; strike count is tracked only.
- Dedicated appeals, unsuspend, and unban action types/endpoints are not defined by V1 action enum. `moderation_admin` can reverse another staff actor's content-state action, but account reinstatement requires a future audited action contract.
- Search backend is not wired; profile search and existing DB/public read surfaces enforce moderation, while future Meilisearch documents must consume moderation status before launch.
