# 35mm Content Moderation V1

> Frozen plan for reporting, moderation review, enforcement, read filtering, and notifications.
> Last updated: 2026-07-11

## 1. Scope

Reportable content:

- Post
- Comment
- Profile

Explicitly outside V1:

- Chat messages
- Lists
- Appeals workflow endpoints
- Automatic suspend/ban suggestions from strike thresholds

## 2. Reporting Contract

- Any authenticated user may report an existing reportable target.
- Client sends only `contentType`, `contentId`, `reason`, and optional `details`.
- Server captures content snapshot synchronously. Client snapshot data is never trusted.
- One unresolved report is allowed per `(reporter, content type, content ID)`.
- `open` and `reviewing` are unresolved. A reporter may submit again after `actioned` or `dismissed`.
- Report mutation limit is 20/hour/user and follows production fail-closed rate-limit behavior.
- Report creation and state-count update commit in one `getWriteDb().transaction(...)` transaction.
- Successful creation enqueues `moderation.autoHideCheck`. Dedupe retries reuse existing report and job identity.

Reasons:

`spam | harassment | hate_speech | violence | nudity_sexual_content | misinformation | self_harm | impersonation | intellectual_property | other`

Snapshot fields:

- Post: body, headline, media, author ID, visibility.
- Comment: body, author ID, post ID.
- Profile: bio, display name, avatar URL, username.

## 3. Review And Audit Contract

Report status:

`open | reviewing | actioned | dismissed`

Actions:

`no_action | content_hidden | content_removed | content_warning_added | user_warned | user_suspended | user_banned | escalated`

- `moderation_actions` is append-only.
- Actor is `staff` or `system`; system actor user ID is null.
- Internal notes never appear in reporter or actioned-user payloads.
- Staff action/dismiss endpoints require `Idempotency-Key`.
- Staff mutation locks target/state/report rows, writes audit action, applies enforcement, resolves reports, updates strikes/account state, and inserts notification outbox in one transaction.
- `user_warned`, `user_suspended`, `user_banned`, and `escalated` increment author strike count exactly once.
- `user_suspended` sets account status to `suspended` and hides profile-backed public reads.
- `user_banned` sets account status to `banned` and removes profile-backed public reads.
- `moderation` may reverse its own or system content enforcement. `owner`, `admin`, and `moderation_admin` may reverse another staff actor's content enforcement.

## 4. Queue And Detail Reads

- Admin queue groups by `(content_type, content_id)`.
- Open queue sorts by report count descending, then last reported time descending, with deterministic content type/ID tie-breakers.
- Queue filters: status, content type, reason.
- Detail includes reports with reporter identity, action history, current state, author information, and broader subject strike/action history.
- Every list and nested history uses opaque keyset cursors. `OFFSET` is forbidden.

## 5. Automatic Hiding

Defaults:

- `MODERATION_AUTO_HIDE_THRESHOLD=5`
- `MODERATION_AUTO_HIDE_WINDOW_MINUTES=60`
- `MODERATION_AUTO_HIDE_TRUSTED_FOLLOWER_THRESHOLD=50000`

Worker requirements:

- Lock current moderation state.
- No-op unless state is visible.
- Require denormalized total report count at threshold.
- Probe only threshold-number unresolved reports inside configured window.
- Exempt authors at or above trusted follower threshold.
- Append one system `content_hidden` action.
- Update moderation state and denormalized target status in same transaction.
- Notify author that content is under review without reporter identity or exact report count.
- Retry against completed automatic hide is idempotent and repairs cache/notification side effects.
- Dismissal restores visibility only if latest enforcement was automatic system hide. Staff enforcement is not implicitly reversed.

## 6. Read Enforcement

- `visible` content follows existing privacy/block/mute/deletion rules.
- `hidden` and `removed` content is excluded from public feed, profile feed, bookmarks, comments, search, discovery, and public profile reads.
- Content author and moderation staff retain access to target state where account authorization permits.
- Posts, comments, and profiles carry indexed denormalized `moderation_status`; hot reads do not join reports.
- Cached feed pages perform one bounded Redis `MGET` for post/profile status. Failed status verification rejects cache and falls back to DB.
- Enforcement writes cache status synchronously before success acknowledgement and explicitly invalidates related caches.

## 7. Notifications

Existing `notifications` system types:

- `report_status_update`: reporter outcome.
- `content_moderated`: actioned author.
- `content_under_review`: auto-hidden author.

Rules:

- Reporter copy is limited to action taken or no violation found.
- Author copy includes content type, action, and policy reason.
- Reporter identity is never sent to author. Reporter-facing notification has no staff/reporter actor identity.
- Notification creation uses existing DB table, `notification.publish`, Ably user channel, Resend email path, and unsubscribe preferences.
- Staff action transaction writes durable outbox intent. Worker batches reporters and uses unique notification source keys for retry safety.

## 8. Scale And Safety

- Hot reads use denormalized indexed status, never report aggregation.
- Report creation performs O(1) indexed writes.
- Auto-hide window check reads at most configured threshold rows.
- Reporter notification relay uses bounded batches and cursor progression.
- All list APIs use keyset pagination.
- UGC remains soft-deleted; moderation status does not hard-delete content.
- No synchronous reporter notification loop runs inside API action requests.
