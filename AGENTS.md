Use `caveman` skill for all assistant prose by default.
Default level: full.
Stop only if user says `stop caveman` or `normal mode`.
Use normal prose when compression risks ambiguity.

# 35mm - Agent Context

Social film platform: Letterboxd x Twitter for cinema.
Target scale: 35M+ users.
Master architecture reference: `docs/architecture.md`
Last agent-context refresh: 2026-06-28.

We will get a minimum of 1 million daily active users. Make sure you are not writing code or taking approaches that hurt at scale.

---


## Monorepo

Turborepo + pnpm workspace.

```txt
apps/web      -> Next.js 15 App Router web app (Vercel)
apps/api      -> Hono REST API (Vercel or Node host)
apps/worker   -> BullMQ background worker (long-running Node)
packages/db   -> Drizzle schema + Neon client source of truth
packages/types       -> Shared TypeScript contracts
packages/validators  -> Shared Zod schemas
packages/ui          -> Shared React primitives
packages/config      -> Shared TS config
```

Root commands:

```bash
pnpm dev        # web + API only; avoids idle BullMQ polling against shared Upstash Redis
pnpm dev:all    # web + API + worker
pnpm dev:web
pnpm dev:api
pnpm dev:worker
pnpm build
pnpm typecheck
pnpm lint
```

Node engine: `>=22.0.0`.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15, React 18, Tailwind, React Query v5, Zustand v5, Clerk, Framer Motion, TipTap, nuqs |
| API | Hono v4 REST API (not tRPC; native Swift/Kotlin clients are a requirement) |
| DB | Neon Postgres + Drizzle ORM |
| Auth | Clerk, with API bearer verification and Svix webhooks |
| Queue | BullMQ over Upstash Redis protocol URL |
| Cache | Upstash Redis REST |
| Realtime | Ably for notification publish/subscribe, with noop fallback on web |
| Media | Cloudflare R2 primary storage and variants; Cloudflare Images optional delivery layer |
| Search | Meilisearch planned, not wired |
| Email | Resend planned, not wired |
| Deploy | Vercel for web/API, long-running Node for worker |

---

## Non-Negotiable Architecture Rules

- 35mm DB is primary. TMDB is fallback/autocomplete/import metadata only.
- Film identity is `films.id`, a 35mm ULID-shaped string. `tmdb_id` and `imdb_id` are unique metadata indexes, never primary keys.
- App URLs and API contracts must use 35mm film IDs, never TMDB IDs.
- `FilmRef.id` in shared API types is the 35mm ID. `tmdbId` may appear only as optional metadata or in TMDB-specific UI flows.
- Do not reintroduce inline film JSON as post identity. `posts.film_id` references `films.id`.
- Pagination is cursor-based everywhere. Do not add OFFSET pagination.
- Hot read paths use denormalized counters and async updates. Do not add live `COUNT()` queries to read payloads.
- User-generated content is soft-deleted with `is_deleted`; do not hard delete posts/comments/lists.
- Ratings are stored as `smallint` 1-10 in DB. Half-stars are a UI rendering concern.
- Comments are max 3 levels deep, enforced in the app/API layer.
- Post visibility exists from day one: `public | followers_only | private`.
- Posts are editable; edit history belongs in `post_edits`.

---

## Current Implementation Reality

| Area | Current state |
|---|---|
| Auth | Clerk is wired in web, API middleware, and webhooks. |
| Profiles/settings | CRUD and onboarding are wired. |
| Films table | Exists in `packages/db/src/schema/films.ts`; IDs are text intended as ULIDs, enforced mostly at app/validator layer. |
| Posts/feed/interactions | Posts, likes, reposts, bookmarks, bookmark folders, polls, comments, and comment likes are API-backed. |
| Follows/moderation | Follows, follow requests, blocks, and mutes are wired. |
| Notifications | DB notifications, bundling, read/unread API, and worker Ably publish exist. Digest/email is still a stub. |
| Lists/watchlists | Film lists, private watchlists, entries, likes, clones, reorder, and TMDB/catalog resolution are wired. |
| Media | R2 presign and worker image variants are wired. Cloudflare Images is optional; Cloudflare Stream is not wired. |
| Feed worker jobs | `feed.fanout`, `feed.rescore`, `feed.pruneFeedItems`, and `counter.increment` are implemented. |
| Search | Meilisearch is not wired; discover/title/composer still rely heavily on TMDB-backed paths. |
| Chat | Frontend module exists; authenticated API routes exist, but persistence is not wired and send returns `501`. |
| Future/mock-heavy surfaces | Short films, communities, festivals, video discovery, and push/email flows are gated or incomplete. |

---

## Feed, Cache, and Worker Rules

Detailed docs:

- `docs/feed-fanout-ranking.md`
- `docs/feed-retention-and-high-follower-cache.md`

Important current behavior:

- Hybrid home feed is implemented.
- Authors below `FEED_HIGH_FOLLOWER_THRESHOLD` (default `10000`) get write fanout into `feed_items`.
- High-follower authors skip write fanout and are merged live at read time.
- Feed score formula lives in `packages/types/src/feedScoring.ts` and is mirrored in SQL in `apps/api/src/modules/feed/routes.ts`.
- `feed_items.score` is computed on write/backfill/fanout and refreshed by `feed.rescore`.
- `feed_items` retention defaults to 30 days via `FEED_ITEMS_RETENTION_DAYS`.
- `feed.pruneFeedItems` deletes old materialized rows in indexed chunks and relies on short feed cache TTL instead of per-viewer prune invalidation.
- Authenticated home feed cursor shape includes score, post ID, ranking timestamp, and materialized retention anchor when relevant.
- High-follower author slices are cached separately with `FEED_HIGH_FOLLOWER_CACHE_TTL_SECONDS` defaulting to 45 seconds and `FEED_HIGH_FOLLOWER_CACHE_POST_LIMIT` defaulting to 100.
- Counter jobs cover post like/comment/repost/bookmark counters, comment likes, poll totals/options, and film list like/entry counters.
- Manual counter reconciliation path:

```bash
pnpm --filter @35mm/worker reconcile:counters -- --scope=<scope> --id=<id>
```

---

## Frontend Conventions

- Default experience is light mode. Additional themes exist through `data-theme`; do not assume dark-first design.
- Fonts: DM Serif Display for headings, DM Sans for body, DM Mono for counters/code.
- Accent: warm red `#c2473a`.
- Main feed max width: 640px centered.
- Shell layout: left navigation, center content, right rail.
- Server/DB state belongs in React Query. Do not mirror it in Zustand.
- Zustand is for UI-only state such as composer modal and mobile bottom chrome.
- Use feature query key factories in `features/*/hooks/queryKeys.ts`. Do not invent ad hoc query strings.
- Optimistic updates are expected for likes, bookmarks, reposts, follows, and similar interactions.
- `PostCard` is memoized and performance-sensitive.
- Heavy UI such as emoji/GIF pickers and film search should be dynamically imported.
- Keep `apps/web/features/feed/types/feed.ts` aligned with shared API contracts. Local TMDB metadata is allowed for UI fallback only, not identity.

Important frontend modules:

- `features/feed`: composer, feed, post cards, comments, polls, mutations.
- `features/profile`: public profile, edit profile, follow state, media upload, connections, blocks/mutes.
- `features/notifications`: notification list/dropdown, mark-read flows, realtime.
- `features/lists`: film lists and watchlists.
- `features/settings`: account, privacy, notifications, appearance, data/security.
- `features/bookmarks`: bookmark page, folder management, post-to-folder flow.
- `features/onboarding`: role, favorite films/genres, follow suggestions.
- `features/discover` and `features/title`: still TMDB-heavy; audit for canonical 35mm film IDs before making contract changes.
- `features/chat`: rich UI and remote/mock abstraction; backend persistence incomplete.

---

## API Conventions and Hotspots

Entry point: `apps/api/src/index.ts`.

Global patterns:

- Load env through `loadEnv()`.
- Initialize DB through `initDb()` / `getDb()`.
- Protected routes use `requireAuth`.
- Optional-auth routes use `getOptionalAuthUser`.
- Error response shape: `{ "code": "ERROR_CODE", "message": "Human readable message" }`.
- Pagination envelope: `{ "items": [], "nextCursor": null, "hasMore": false }`.
- Validators come from `packages/validators`; shared response contracts come from `packages/types`.

Graph output from `apps/api` (`graphify-out-api/GRAPH_REPORT.md`) highlights these central nodes:

- `getDb()` - main cross-community bridge; avoid duplicating DB access patterns.
- `loadEnv()` - central env/config bridge used by API and jobs.
- `badRequest()` / `notFound()` - common error helpers; keep error contract consistent.
- `resolveProfileAvatarUrl()` / `resolvePublicMediaUrl()` / `getR2ObjectKeyFromUrl()` - media URL hotspots.
- `createNotification()` and `getUnreadNotificationCount()` - notification DB hotspots.
- `invalidateViewerFeedCaches()` - feed cache invalidation hotspot.

API graph caveat: the generated API graph is AST-only, but dense enough to be useful: 396 nodes, 977 retained edges, 14 communities. It reported 198 dangling raw endpoints, so verify source before relying on any absent edge.

---

## Graphify Output Notes

Local graph artifacts may exist:

- `graphify-out-api/` for `apps/api`
- `graphify-out/` for `apps/web`

The `apps/web` graph is currently sparse and AST-only: 754 nodes but only 21 retained edges, with many dangling endpoints. Use it for rough node discovery only; inspect source directly for frontend dependency or architecture claims.

The `apps/api` graph is more useful. It shows no import cycles and identifies weakly cohesive route communities around `getDb()`, feed cache, jobs, notifications, media/R2, settings, and cursor/error helpers. If a future task asks "how does this API path work?", start with the relevant graph report/query, then verify in source.

Do not commit generated graph outputs unless the user explicitly asks. They are local analysis artifacts.

---

## Current Gaps and Priority Work

Highest priority:

1. Add a general films API and catalog search.
2. Wire Meilisearch for films/users/posts.
3. Add DB-level checks for ULID-shaped text IDs where practical.
4. Audit TMDB-backed title/discover/composer paths for canonical 35mm ID compliance.
5. Finish notification digest and Resend email integration.
6. Decide whether chat remains gated or gets real persistence.
7. Wire Cloudflare Stream if production video is in scope.
8. Validate migrations against current Drizzle schema in real environments.

Known contract/status notes:

- `post_bookmarks`, `bookmarkCount`, and `isBookmarked` are current. Do not use the old save/saveCount naming.
- `packages/types` uses canonical film IDs in `FeedPost.film.id`; optional `tmdbId` still appears in TMDB/catalog input flows and some frontend-local types.
- `films` exists, but no broad film search/API module exists yet.
- `notification.digest`, search indexing, email, Cloudflare Stream, and chat persistence remain incomplete.

---

## Testing Guidance

Useful commands:

```bash
pnpm --filter @35mm/web test
pnpm --filter @35mm/api test
pnpm --filter @35mm/api typecheck
pnpm --filter @35mm/worker typecheck
pnpm typecheck
```

Coverage exists for API media variants, rich text validators, feed rich mentions, mention notifications, home feed merge behavior, web rich text rendering, R2 media helpers, post media helpers, comment section, search bar, post composer, settings schemas/hooks, notifications panel, and modal focus stack.

For cross-layer changes, keep schema, validators, shared types, API routes, frontend adapters/hooks, and worker side effects aligned in the same change.

## Engineering Standard: Production-Grade Only

This codebase targets 1M+ active users in production. There is no "dev mode" or
"good enough for now" tier of code. Every PR is held to the same bar regardless
of whether the feature is shipping today or in six months.

### Hard rules — non-negotiable

- **No placeholder/stub logic.** Never write `// TODO: handle this properly later`,
  fake data, hardcoded test values, or `console.log`-driven debugging left in
  the final diff. If a dependency isn't ready, say so — don't stub it silently.
- **No unbounded queries.** Every list endpoint uses cursor-based pagination.
  `OFFSET` pagination is forbidden at this scale.
- **No synchronous heavy writes.** Counters (likes, follows, view counts, etc.)
  are denormalized and updated async via BullMQ — never computed with `COUNT(*)`
  on read, never incremented inline in the request path.
- **No hard deletes** on user-generated content. Soft delete with `deletedAt`
  and tombstone behavior where applicable.
- **All mutations must be idempotent.** Assume retries, duplicate webhook
  deliveries, and double-clicks. Use idempotency keys where the client can't
  guarantee single-submission.
- **Rate limiting is mandatory on every public mutation endpoint**, not
  added later — use the existing Upstash rate limiter.
- **No N+1 queries.** If a loop hits the DB, it's wrong. Batch, join, or
  use dataloader-style patterns.
- **No silent failure paths.** Errors must be caught, logged with context, and
  surfaced — never swallowed with an empty catch block.
- **No client-trusted authorization.** All access control is enforced
  server-side, even if the UI already hides the action.
- **Cache invalidation must be explicit.** If you add a Redis cache, you
  document and implement its invalidation path in the same PR — no
  "I'll add invalidation later."

### Required for every new feature

1. State which of the documented architecture patterns it follows (hybrid
   fan-out, social-proof caching, BullMQ async jobs, etc.) — if none apply,
   say why.
2. State the read/write volume assumption at 1M+ DAU and confirm the design
   holds up at that scale (e.g., "this is a per-user query, scales linearly,
   fine" vs "this needs to be cached/precomputed").
3. Call out any new index required and confirm it's added to the Drizzle schema.
4. No feature ships without rate limiting, soft-delete semantics (if it
   touches UGC), and pagination (if it returns a list) already wired in —
   not flagged as follow-up work.

### Explicitly forbidden phrases/patterns in generated code or PR descriptions

"for now", "quick fix", "we can optimize this later", "good enough for an MVP",
"temporary", "hacky but works" — if any of these would honestly describe the
code, the code is wrong, not the description. Fix it before submitting.

### When scope must be cut

If a fully production-grade implementation is genuinely out of scope for the
current task, stop and flag it explicitly to the user with the specific
tradeoff being made — never silently downgrade quality to fit a deadline.

## Notes:

Whenever you make code changes in this repo, also update the architecture/codebase docs if the change affects app structure, API routes, DB schema, shared types, validators, worker jobs, feature wiring, env vars, or known gaps.

Docs to keep current:
- docs/architecture.md
- codebase-analysis-docs/CODEBASE_KNOWLEDGE.md
- codebase-analysis-docs/chat-backend.md
- codebase-analysis-docs/assets/*.mmd if diagrams change

Before finishing:
1. Check whether the change impacts those docs.
2. Update the relevant sections.
3. Run the appropriate build/typecheck/test.
4. Mention in the final response whether docs were updated or why no doc update was needed.
