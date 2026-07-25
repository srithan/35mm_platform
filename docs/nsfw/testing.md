# NSFW Content Classification Testing

## Always-On

```bash
pnpm --filter @35mm/db exec drizzle-kit check
pnpm --filter @35mm/types typecheck
pnpm --filter @35mm/validators typecheck
pnpm --filter @35mm/api typecheck
pnpm --filter @35mm/api test
pnpm --filter @35mm/worker typecheck
pnpm --filter @35mm/worker test
pnpm typecheck
```

Coverage includes enum validation, stripping client `nsfwStatus`, media
normalization, no read-path exclusion predicate, author-category retention,
pending-to-none resolution, category union, and matched-only media updates.

## DB-Gated

```bash
RUN_NSFW_DB_TESTS=1 pnpm --filter @35mm/api test -- src/modules/feed/nsfw.db.test.ts
RUN_NSFW_DB_TESTS=1 pnpm --filter @35mm/worker test -- src/jobs/nsfwScan.db.test.ts
```

Use a disposable database migrated through
`0054_nsfw_content_classification.sql`. Tests cover priority report enqueue,
transaction rollback of author flags, and repeat-scan idempotence.

## Operational

- Apply migration `0054`.
- Configure and health-check the internal classifier endpoint.
- Confirm failed/unconfigured classification leaves content pending.
- Verify BullMQ priority scans run ahead of normal scans.
- Verify mixed-media JSON preserves unclassified items and media variants.
- Verify feed/comment reads return flagged rows without filtering.

## Latest Local Run

Completed 2026-07-25:

- Drizzle schema check: passed.
- Types, validators, API, and worker package typechecks: passed.
- API suite: 111 passed, 22 skipped.
- Worker suite: 18 passed, 1 skipped.
- Three NSFW DB-gated cases skipped because `RUN_NSFW_DB_TESTS=1` was not set.
- Root recursive typecheck reached an unrelated existing
  `apps/studio/app/layout.tsx` ClerkProvider/React JSX type incompatibility and
  exited before completion; changed package typechecks remain clean.

## Web Stage

```bash
pnpm --filter @35mm/web test
pnpm --filter @35mm/web typecheck
```

Coverage includes pending/flagged/clear overlay states, local reveal without a
refetch, mixed flagged/unflagged galleries, composer payload inclusion and
omission, hidden-at-rest content-warning controls, manual opening, dismissal,
and advisory-triggered opening.

Latest local run on 2026-07-25:

- Web suite: 50 files passed, 161 tests passed.
- Web typecheck: the NSFW change set is clean. The command still exits non-zero
  on 12 pre-existing web files covering Clerk/React JSX compatibility,
  Blurhash/Cropper class-component typings, styled-jsx attributes,
  ThemeProvider typings, and unrelated implicit event parameters.
