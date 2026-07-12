# Content Moderation Testing

## Commands

Always-on validation:

```bash
pnpm --filter @35mm/db typecheck
pnpm --filter @35mm/types typecheck
pnpm --filter @35mm/validators typecheck
pnpm --filter @35mm/api typecheck
pnpm --filter @35mm/api test
pnpm --filter @35mm/worker typecheck
pnpm --filter @35mm/worker test
pnpm --filter @35mm/web test
pnpm --filter @35mm/db exec drizzle-kit check
```

Real Postgres moderation suite:

```bash
RUN_MODERATION_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/moderation/moderation.db.test.ts
```

Requires `DATABASE_URL` pointing at a disposable database migrated through `0047_profile_post_count.sql`.

## Always-On Coverage

`apps/api/src/modules/moderation/moderation.test.ts`:

- Report dedupe considers only `open` and `reviewing` unresolved.
- `actioned` and `dismissed` permit later reporting.
- Content action-to-status mapping.
- Strike actions include warning, suspension, ban, and escalation.
- Static guard reads moderation API/worker sources and rejects SQL `OFFSET` or Drizzle `.offset(...)`.

`apps/worker/src/jobs/moderationAutoHide.test.ts`:

- Exact threshold triggers hide.
- Total count below threshold does not hide.
- Window count below threshold does not hide.
- Trusted follower threshold is inclusive exemption.
- Hidden/removed state is idempotent no-op.

Existing API/web suites cover shared rate-limit failure behavior, notification persistence helpers, feed merge behavior, profile route response contracts, and notification UI/realtime compilation paths exercised by Vitest.

## DB-Gated Coverage

`apps/api/src/modules/moderation/moderation.db.test.ts` verifies real transaction behavior:

- Duplicate unresolved report returns same report ID.
- Duplicate does not increment `moderation_content_state.report_count`.
- Staff action resolves all open reports on target with one action ID.
- Strike increments exactly once.
- Durable notification outbox row commits with action/report/strike changes.
- Idempotency retry creates no second action, strike, or outbox row.
- Same reporter may create a new report after prior resolution.
- `user_banned` writes distinct banned account state and removed profile moderation state.

Queue/cache effects are mocked in DB suite so it tests Postgres transaction boundary without requiring Redis, Ably, or Resend. Outbox persistence is durability assertion; worker delivery behavior is covered by unit logic and should receive integration coverage in staging.

## Test Data Safety

DB suite uses reserved UUIDs ending `9101`–`9105`, usernames prefixed `moderation-test-`, and one synthetic post. Cleanup removes notifications, outbox, reports, actions, content state, post, profiles, and users. Run only against disposable or staging databases.

## Operational Verification

Before production launch:

- Apply migrations `0043` through `0047` in order.
- Run DB-gated suite in every migrated environment.
- Exercise BullMQ retry after cache synchronization failure.
- Exercise stale outbox lock reclaim after five minutes.
- Load-test brigaded content with reporter batches above 500 and verify cursor progress.
- Verify Ably payloads and Resend copy contain no reporter identity.
- Verify suspended and banned accounts cannot authenticate and disappear from public profile-backed reads.
- Verify future Meilisearch documents exclude hidden/removed targets before enabling search.

## Latest Local Run

Completed 2026-07-12:

- Root workspace typecheck: passed.
- API default suite: 61 passed, 19 skipped, including legacy notification report-ID recovery.
- Moderation DB-gated suite: 4 passed against configured migrated Neon database.
- Worker: 4 passed.
- Web: 65 passed, including exact report notification routing, legacy fallback,
  captured rich-text rendering, and PostCard/CommentCard author + timestamp
  presentation for reporter snapshots.
- Drizzle schema check: passed.
- Moderation no-`OFFSET` static guard: passed.
- Diff whitespace check: passed.

Migrations through `0047_profile_post_count.sql` were applied to configured Neon database. Post-migration schema verification passed and DB-gated moderation tests passed 4/4.

The DB-gated dedupe case also verifies reporter-owned detail lookup, captured
snapshot sanitization, author/timestamp capture, legacy snapshot hydration from
soft-deleted source rows, profile social-count/joined-date capture, and
indistinguishable `404` behavior for a different user.

## Known Test Boundary

Dedicated appeals/reinstatement workflow is outside V1 action contract, so no unsuspend/unban test exists. Chat-message and list reporting are also outside V1.
