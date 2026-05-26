# 35mm Platform — Architecture & System Design
> Master reference document. Use to onboard any AI session, IDE agent, or new engineer.
> Last updated: 2026-05-24

---

## 0. What This Is

35mm is a social film platform — think Letterboxd × Twitter for cinema. Target scale: **35M+ users**. Every architecture decision must hold at that load. This document is the single source of truth for product scope, system design, tech stack, DB schema, API contracts, state management strategy, scalability patterns, and performance guidelines.

---

## 1. Monorepo Structure

```
35mm_platform/                   ← Turborepo + pnpm workspaces
├── apps/
│   ├── web/                     ← Next.js 15 App Router (user-facing web)
│   ├── api/                     ← Hono REST API (product data + mutations)
│   └── worker/                  ← BullMQ background jobs (fanout, notifications, digests)
├── packages/
│   ├── db/                      ← Drizzle schema + Neon client (source of truth for schema)
│   ├── types/                   ← Shared TypeScript domain contracts
│   ├── validators/              ← Shared Zod validation schemas
│   ├── ui/                      ← Shared React UI primitives
│   └── config/                  ← Shared TypeScript config
```

**Deploy targets:**
- `apps/web` → Vercel
- `apps/api` → Vercel (serverless) or dedicated Node (scale choice)
- `apps/worker` → Long-running Node process (Railway / Fly.io)
- `packages/db` → Not deployed; consumed by api + worker

---

## 2. Tech Stack

### 2.1 Frontend (`apps/web`)

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| React | React 18 |
| Styling | Tailwind CSS v3 |
| Server state | TanStack React Query v5 |
| Client state | Zustand v5 |
| Forms | React Hook Form + Zod (via `@hookform/resolvers`) |
| Auth | Clerk (`@clerk/nextjs`) |
| Animation | Framer Motion v11 |
| URL state | nuqs v2 |
| Analytics | Vercel Analytics + Speed Insights |
| Testing | Vitest + Testing Library + Happy DOM |

**Design system:**
- Fonts: DM Serif Display (headings), DM Sans (body), DM Mono (code/counters)
- Accent: `#c2473a` (warm red)
- Always light mode (dark mode is user-configurable via `theme` setting, but default is light)
- Feed max-width: 640px centered
- Shell: 3-column layout (left nav, center feed, right panel)

### 2.2 Backend (`apps/api`)

| Concern | Choice |
|---|---|
| API framework | Hono v4 (Node — chosen over tRPC for native Swift/Kotlin support) |
| ORM | Drizzle ORM |
| Database | Neon (serverless Postgres) |
| Auth | Clerk backend (`verifyToken`) |
| Webhook verification | Svix |
| File storage | Cloudflare R2 (presigned uploads) |
| Validation | Zod |

### 2.3 Infrastructure & Services

| Concern | Choice | Status |
|---|---|---|
| Database | Neon (Postgres) | ✅ Wired |
| File storage | Cloudflare R2 | ✅ Wired |
| Video streaming | Cloudflare Stream | ⬜ Not yet wired |
| Image optimization | Cloudflare Images | ⬜ Not yet wired |
| Background jobs | BullMQ | ⬜ Worker stubs only |
| Job queue broker | Upstash Redis | ⬜ Not yet wired |
| Cache | Upstash Redis | ⬜ Not yet wired |
| Realtime | Ably | ⬜ Not yet wired (noop transport) |
| Search | Meilisearch | ⬜ Not yet wired |
| Email | Resend | ⬜ Not yet wired |
| Auth | Clerk | ✅ Wired |
| Deploy (web) | Vercel | ✅ |

---

## 3. Film Database Strategy (Critical — Never Violate)

- **35mm DB is always primary.** TMDB is a cold-start fallback only.
- Films have their own `films` table. Film data is never stored as inline JSONB.
- **Film PKs = ULIDs.** `imdb_id` and `tmdb_id` are unique indexes, never PKs.
- **Film URLs use the 35mm ULID, never TMDB ID.** e.g. `/title/film/01HQ2...` not `/title/film/27205`
- All films in a single `films` table with `source` enum: `35mm | tmdb_import | user_contributed`
- `FilmRef.id` in all types/API contracts must always be the 35mm ULID — **never `tmdbId`**
- TMDB proxy (`/api/tmdb/[...path]`) is for search autocomplete only, not for film identity

**Pre-launch data strategy:**
- Target: 30K–40K+ Indian regional cinema films (Kannada, Tamil, Telugu, Malayalam, Marathi, Bengali, Punjabi) seeded by beta contributors
- Selective TMDB bulk import for Indian-language films before beta open
- Full TMDB catalog import post-launch via daily delta sync (change list endpoint)

**⚠️ Current gap:** `posts.film` is still a JSONB column using `tmdbId`. This must be migrated to a proper `films` table with ULID PKs and a `post_films` join or `film_id` FK on posts before the API contract is finalized.

---

## 4. Database Schema

### 4.1 Current State (what exists in migrations)

**Enums:** `account_status` (`active | deactivated | suspended`), `post_type` (`text | discussion | log | review | image`)

**Tables:** `users`, `profiles`, `user_settings`, `posts`, `post_likes`, `post_reposts`, `post_saves`

**User PK:** currently `uuid` (gen_random_uuid). Needs decision: migrate to ULID for time-ordering benefits, or keep UUID and use ULID only for films.

### 4.2 Pending Renames (do before writing API contract)

- `post_saves` → `post_bookmarks`
- `FeedPost.saveCount` → `FeedPost.bookmarkCount`
- `FeedPost.isSaved` → `FeedPost.isBookmarked`

### 4.3 Full Target Schema (what needs to be built in `packages/db`)

#### Enums to add:
```
post_visibility:    public | followers_only | private
follow_status:      pending | accepted
notification_type:  like | comment | reply | follow | follow_request | mention | repost
film_source:        35mm | tmdb_import | user_contributed
rating_value:       1..10 (int, half-star = 0.5 in UI)
```

#### Tables to add:

**`films`**
- `id`: ULID (text), PK
- `tmdb_id`: int, unique index, nullable
- `imdb_id`: text, unique index, nullable
- `title`: text, not null
- `original_title`: text
- `year`: int
- `runtime`: int (minutes)
- `overview`: text
- `poster_url`: text
- `backdrop_url`: text
- `genres`: text[] (Postgres array)
- `director`: text
- `language`: text
- `country`: text
- `source`: `film_source`, not null
- `contributed_by_user_id`: uuid, FK → users.id, nullable
- `is_verified`: boolean, default false
- `created_at`, `updated_at`: timestamptz

Indexes: `films_tmdb_id_idx`, `films_imdb_id_idx`, `films_title_year_idx`

**`follows`**
- `follower_id`: uuid, FK → users.id
- `following_id`: uuid, FK → users.id
- `status`: `follow_status`, default `accepted`
- `created_at`: timestamptz
- PK: (`follower_id`, `following_id`)

**`post_bookmarks`** (renamed from `post_saves`)
- `post_id`: uuid, FK → posts.id
- `user_id`: uuid, FK → users.id
- `created_at`: timestamptz
- Unique index: (`post_id`, `user_id`)

**`comments`**
- `id`: uuid, PK
- `post_id`: uuid, FK → posts.id
- `user_id`: uuid, FK → users.id
- `parent_id`: uuid, FK → comments.id, nullable (max 3 levels, enforced in app layer)
- `body`: text (max 1000)
- `like_count`: int, default 0 (denormalized)
- `is_deleted`: boolean, default false (soft delete)
- `edited_at`: timestamptz, nullable
- `created_at`, `updated_at`: timestamptz

Indexes: `comments_post_id_created_at_idx`, `comments_parent_id_idx`

**`comment_likes`**
- `comment_id`: uuid, FK → comments.id
- `user_id`: uuid, FK → users.id
- `created_at`: timestamptz
- Unique index: (`comment_id`, `user_id`)

**`film_logs`** (for diary/reviews)
- `id`: uuid, PK
- `user_id`: uuid, FK → users.id
- `film_id`: text (ULID), FK → films.id
- `rating`: smallint (1–10), nullable
- `review`: text, nullable
- `watched_on`: date, nullable
- `is_rewatch`: boolean, default false
- `contains_spoilers`: boolean, default false
- `post_id`: uuid, FK → posts.id, nullable (linked log post)
- `created_at`, `updated_at`: timestamptz

Indexes: `film_logs_user_id_film_id_idx`, `film_logs_user_id_watched_on_idx`

**`watchlist`**
- `user_id`: uuid, FK → users.id
- `film_id`: text (ULID), FK → films.id
- `created_at`: timestamptz
- PK: (`user_id`, `film_id`)

**`film_lists`**
- `id`: uuid, PK
- `user_id`: uuid, FK → users.id
- `title`: text
- `description`: text, nullable
- `is_public`: boolean, default true
- `film_count`: int, default 0 (denormalized)
- `created_at`, `updated_at`: timestamptz

**`film_list_items`**
- `list_id`: uuid, FK → film_lists.id
- `film_id`: text (ULID), FK → films.id
- `position`: int
- `note`: text, nullable
- `created_at`: timestamptz
- PK: (`list_id`, `film_id`)

**`notifications`**
- `id`: uuid, PK
- `recipient_id`: uuid, FK → users.id
- `actor_id`: uuid, FK → users.id, nullable
- `type`: `notification_type`
- `entity_id`: text, nullable (post id, comment id, etc.)
- `entity_type`: text, nullable
- `is_read`: boolean, default false
- `bundle_count`: int, default 1 (for grouped notifs)
- `created_at`: timestamptz

Indexes: `notifications_recipient_id_created_at_idx`, `notifications_recipient_id_is_read_idx`

**`feed_items`** (fanout table for hybrid feed)
- `id`: uuid, PK
- `user_id`: uuid (feed owner), FK → users.id
- `post_id`: uuid, FK → posts.id
- `score`: float8 (for ranking)
- `created_at`: timestamptz

Indexes: `feed_items_user_id_created_at_idx` (primary query path)

**`post_edits`** (edit history)
- `id`: uuid, PK
- `post_id`: uuid, FK → posts.id
- `body`: text
- `headline`: text, nullable
- `edited_at`: timestamptz

**`communities`**
- `id`: uuid, PK
- `slug`: text, unique
- `name`: text
- `description`: text, nullable
- `avatar_url`: text, nullable
- `cover_url`: text, nullable
- `member_count`: int, default 0 (denormalized)
- `is_private`: boolean, default false
- `created_by`: uuid, FK → users.id
- `created_at`, `updated_at`: timestamptz

**`community_members`**
- `community_id`: uuid, FK → communities.id
- `user_id`: uuid, FK → users.id
- `role`: text, default `'member'`
- `joined_at`: timestamptz
- PK: (`community_id`, `user_id`)

### 4.4 Posts table: changes needed

Add to `posts`:
- `visibility`: `post_visibility`, default `public`
- `film_id`: text (ULID), FK → films.id, nullable (replaces JSONB `film` column)
- `reply_to_id`: uuid, FK → posts.id, nullable (for quote posts)
- `is_repost`: boolean, default false
- `like_count`: int, default 0 (denormalized counter)
- `comment_count`: int, default 0 (denormalized counter)
- `repost_count`: int, default 0 (denormalized counter)
- `bookmark_count`: int, default 0 (denormalized counter)
- `is_deleted`: boolean, default false (soft delete)
- `edited_at`: timestamptz, nullable
- `community_id`: uuid, FK → communities.id, nullable

Remove from `posts`:
- `film` JSONB column (migrate to `film_id` FK after films table is populated)

---

## 5. API Architecture

### 5.1 Structure

```
apps/api/src/
├── index.ts              ← Hono app, CORS, middleware mount
├── lib/
│   ├── db.ts             ← Neon + Drizzle client
│   ├── env.ts            ← Zod-validated env
│   ├── errors.ts         ← ApiError class + error codes
│   ├── middleware.ts      ← requireAuth, rateLimiter
│   └── redis.ts          ← Upstash Redis client (to add)
└── modules/
    ├── auth/             ← /v1/me, /v1/usernames/:username/available
    ├── profiles/         ← /v1/profiles/:username, PATCH /v1/profiles/me
    ├── feed/             ← /v1/feed (home + profile feeds, post CRUD, likes, reposts)
    ├── films/            ← /v1/films/:id, /v1/films/search (to add)
    ├── logs/             ← /v1/logs (film diary, reviews) (to add)
    ├── lists/            ← /v1/lists (to add)
    ├── comments/         ← /v1/feed/posts/:id/comments (to add)
    ├── notifications/    ← /v1/notifications (to add)
    ├── follows/          ← /v1/follows (to add)
    ├── search/           ← /v1/search (Meilisearch proxy) (to add)
    ├── media/            ← /v1/media/presign, /v1/media/resolve-url
    ├── settings/         ← /v1/me/settings/*
    ├── chat/             ← /v1/chat/* (partially implemented)
    └── webhooks/         ← /v1/webhooks/clerk
```

### 5.2 Auth Pattern

Every protected route uses `requireAuth` middleware:
1. Extract `Authorization: Bearer <token>`
2. Verify via Clerk `verifyToken`
3. `ensureLocalUser` — creates user/profile/user_settings on first call
4. Attach `ctx.var.userId` to Hono context
5. Block `deactivated` / `suspended` accounts with 403

### 5.3 Error Contract

```json
{ "code": "SNAKE_CASE_ERROR_CODE", "message": "Human-readable message" }
```

### 5.4 Response Envelope (paginated)

```json
{
  "items": [],
  "nextCursor": "cursor_string_or_null",
  "hasMore": false
}
```

Cursor strategy: use ULID or `(created_at, id)` composite for stable ordering. **Never use OFFSET.**

---

## 6. Feed Architecture (Scale-Critical)

### 6.1 Hybrid Fan-out

- **Write fan-out** (push model): for users with **< 10K followers**, push new posts into each follower's `feed_items` row via BullMQ job at post time. O(followers) writes.
- **Read fan-out** (pull model): for users with **≥ 10K followers** (celebrities/verified accounts), skip push. At feed read time, merge their posts into the ranked feed via pull query.
- Home feed query: `SELECT * FROM feed_items WHERE user_id = $1 ORDER BY created_at DESC` + merge pull results for followed celebrities.

### 6.2 Feed Read Path

```
Request → Redis cache check (user feed, 60s TTL)
        → Cache miss → Postgres feed_items query + celebrity pull merge
        → Score/rank
        → Cache write
        → Return page
```

### 6.3 Post Counter Denormalization

All counters (`like_count`, `comment_count`, `repost_count`, `bookmark_count`) are denormalized columns on `posts`. They are updated asynchronously via BullMQ jobs — never via live COUNT() queries. This is critical at scale.

Write path for a like:
1. Insert into `post_likes`
2. Return optimistic response immediately
3. Enqueue `INCREMENT_POST_COUNTER` BullMQ job
4. Worker increments `posts.like_count`

---

## 7. Background Worker (`apps/worker`)

### 7.1 Job Types (to implement with BullMQ + Upstash Redis)

| Job | Trigger | Action |
|---|---|---|
| `feed.fanout` | Post created | Push post to follower feed_items rows (< 10K followers) |
| `notification.dispatch` | Like, comment, follow, mention | Insert notification row, push Ably event |
| `notification.digest` | Cron (daily) | Bundle unread notifications, send Resend email |
| `counter.increment` | Like, repost, bookmark, comment | Increment denormalized counter on posts/comments |
| `counter.decrement` | Unlike, unrepost, unbookmark | Decrement counter |
| `search.index` | Post/film/user created/updated | Index document in Meilisearch |
| `media.process` | Upload complete | Trigger Cloudflare Images optimization |

### 7.2 Queue Config

- Queue broker: Upstash Redis (connection via `@upstash/redis` or `ioredis`)
- Processor: BullMQ workers in `apps/worker`
- Retry: exponential backoff, max 3 attempts
- Dead letter queue: for failed jobs after retries

---

## 8. Realtime Architecture

Ably is the realtime transport. Currently a noop stub — needs wiring.

### 8.1 Channels

| Channel | Events | Subscribers |
|---|---|---|
| `user:{userId}:notifications` | `notification.new` | User's browser/app |
| `post:{postId}` | `like`, `comment`, `repost` | Anyone viewing the post |
| `chat:{conversationId}` | `message.new`, `message.deleted`, `reaction` | Conversation participants |
| `feed:{userId}` | `post.new` | User's feed (for "new posts" banner) |

### 8.2 Integration Points

- `ChatRealtimeProvider` → swap noop transport for Ably transport
- Notification bell → subscribe to `user:{userId}:notifications`
- Feed → subscribe to `feed:{userId}` for live "X new posts" indicator

---

## 9. State Management Strategy (Frontend)

### 9.1 Principle: Server State vs Client State

- **Server state** (remote data that lives in DB): managed entirely by **React Query**. This is the primary state layer. Never duplicate server state in Zustand.
- **Client state** (local UI state with no server equivalent): managed by **Zustand**.

### 9.2 React Query Conventions

```ts
// Query key factories — always use these, never ad-hoc strings
export const feedKeys = {
  all: ['feed'] as const,
  home: () => [...feedKeys.all, 'home'] as const,
  profile: (username: string) => [...feedKeys.all, 'profile', username] as const,
  post: (id: string) => [...feedKeys.all, 'post', id] as const,
}

// Stale times at scale
const FEED_STALE_TIME = 30_000       // 30s — feed doesn't need to be fresh every second
const PROFILE_STALE_TIME = 60_000    // 60s
const FILM_STALE_TIME = 300_000      // 5min — film metadata is slow-changing
const SETTINGS_STALE_TIME = 300_000  // 5min

// Infinite feed
useInfiniteQuery({
  queryKey: feedKeys.home(),
  queryFn: ({ pageParam }) => feedApi.getHomeFeed({ cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  staleTime: FEED_STALE_TIME,
})
```

**Optimistic updates** for all mutations (likes, bookmarks, reposts, follows):
```ts
useMutation({
  mutationFn: postsApi.likePost,
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: feedKeys.post(postId) })
    const prev = queryClient.getQueryData(feedKeys.post(postId))
    queryClient.setQueryData(feedKeys.post(postId), (old) => ({
      ...old,
      isLiked: true,
      likeCount: old.likeCount + 1,
    }))
    return { prev }
  },
  onError: (_, postId, ctx) => {
    queryClient.setQueryData(feedKeys.post(postId), ctx.prev)
  },
})
```

### 9.3 Zustand Stores (client-only state)

| Store | State |
|---|---|
| `useComposerStore` | Post composer open/closed, draft content, active tab |
| `useUIStore` | Mobile sidebar open, active modal, active sheet |
| `useChatSidebarStore` | Chat sidebar open/closed, active conversation id |
| `useOnboardingStore` | Onboarding step, selections |
| `useSearchStore` | Search overlay open, recent searches |

**Rule:** Zustand stores must not mirror any server data. If you find yourself syncing Zustand with a React Query response, delete the Zustand store and use React Query directly.

---

## 10. Frontend Performance Strategy

### 10.1 Rendering Strategy per Route

| Route | Strategy | Reason |
|---|---|---|
| `/` (feed) | Client component + React Query | Personalized, can't be statically rendered |
| `/[username]` (profile) | SSR with `fetch` + React Query hydration | SEO + initial load speed |
| `/title/film/[id]` | ISR (revalidate: 3600) | Film data changes rarely |
| `/landing` | Static | No auth needed |
| `/discover` | Client component + React Query | Dynamic filters |

### 10.2 Image Strategy

- Upload path: client uploads original to private R2 via presigned `PUT`; presign response includes deterministic variant URLs (`thumb`, `feed`, `full`)
- Read path: feed APIs return stable cacheable variant URLs from `posts.media[].variants` (`feed` for timeline, `full` for lightbox); no expiring presigned GET URLs in feed payloads
- Variant targets:
  - `thumb`: ~320w WebP (quick preview / low-bandwidth)
  - `feed`: ~640w WebP (timeline/default)
  - `full`: up to ~2048w WebP (viewer/post detail)
- Metadata stored in `posts.media` JSON:
  - `key`, `variants`, `blurhash`, `width`, `height`, `thumbnailUrl`
- Processing model:
  - `apps/worker` runs `media.process` job, generates variants + blurhash, updates `posts.media` and `posts.media_urls`
  - `apps/worker/src/scripts/backfillMedia.ts` handles idempotent historical backfill in cursor batches

### 10.3 Feed Performance

- `PostCard` is memoized (`React.memo`) with prop comparator to avoid scroll re-render storms
- Feed image loading is viewport-aware:
  - shared `LazyR2Image` gate via `IntersectionObserver` (`rootMargin: 200px`)
  - carousel loads only active slide ±1 while near viewport
  - on `saveData`, carousel auto-load is reduced to active slide only
- Infinite sentinel prefetches upcoming page around 80% visibility (`queryClient.prefetchInfiniteQuery`), then hydrates main infinite cache
- hover/focus on feed cards prefetches post detail query and first viewer image
- `InfinitePostList` uses `@tanstack/react-virtual` when list size exceeds 50 cards to reduce DOM pressure
- connection-aware variant selection:
  - default: `feed` variant
  - `slow-2g|2g|3g` or `saveData`: `thumb` variant in feed/profile/bookmarks

### 10.4 Bundle Strategy

- Route-based code splitting via Next.js App Router (automatic)
- Heavy components (emoji picker, GIF picker, film search) are dynamically imported
- `framer-motion` is lazy — only import `motion` where used, not whole lib

### 10.5 Service Worker

- `ServiceWorkerRegistration.tsx` registers `/sw.js` in app shell
- Versioned caches:
  - `35mm-nav-*` (offline shell + navigation fallback)
  - `35mm-static-*` (Next static assets, scripts/styles/fonts/icons)
  - `35mm-image-*` (immutable CDN images: `*.r2.dev`, `*.imagedelivery.net`, `/images/*`)
  - `35mm-api-*` (network-first cache for cacheable same-origin `GET /v1/*` responses)
- API cache safety:
  - skip cache when request has `Authorization` header
  - skip cache when response `Cache-Control` is `private` or `no-store`

---

## 11. Backend Performance & Scalability

### 11.1 Database

- **Connection pooling:** Neon serverless driver handles this, but set `max` connections per instance appropriately. If running as long-lived Node (not serverless), use `pg` + a pool explicitly.
- **Indexes — every query path must have one.** Never scan without an index at scale.
- **Soft deletes everywhere** — `is_deleted: boolean` column. Never hard delete user-generated content.
- **VACUUM strategy:** Neon handles autovacuum but monitor dead tuple bloat on high-write tables (`posts`, `post_likes`, `feed_items`, `notifications`)

### 11.2 Caching Layers

```
Request
  → Upstash Redis (L1, 60s TTL for feed pages, 300s for film metadata)
  → Neon Postgres (source of truth)
```

Cache invalidation:
- On post creation: invalidate `feed:{userId}` cache for all followers (via BullMQ job)
- On profile update: invalidate `profile:{username}` cache
- On film update: invalidate `film:{filmId}` cache

Current implementation (2026-05-26):
- Feed endpoints cache in Upstash Redis:
  - `GET /v1/feed`
  - `GET /v1/feed/profiles/:username/posts`
- TTL: 60s, keyed by viewer + cursor + limit
- Index sets track cache keys per viewer and per profile author for targeted invalidation
- Response header `X-Feed-Cache: HIT|MISS` exposed for cache hit-rate measurement
- HTTP cache headers:
  - personalized feed: `Cache-Control: private, no-store`
  - guest profile-post feed: `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`

### 11.3 Rate Limiting

Every public-facing endpoint needs rate limiting via Upstash Redis (`@upstash/ratelimit`):
- Feed: 60 req/min per IP
- Post creation: 30 req/min per user
- Like/bookmark: 120 req/min per user
- Media presign: 20 req/min per user
- Search: 30 req/min per IP

### 11.4 API Response Targets

| Endpoint | P99 target |
|---|---|
| GET /v1/feed | < 200ms |
| GET /v1/profiles/:username | < 100ms |
| POST /v1/feed (create post) | < 300ms |
| GET /v1/films/:id | < 100ms (cache hit < 10ms) |
| GET /v1/notifications | < 150ms |

---

## 12. Search Architecture

Meilisearch handles all search. Three indexes:

| Index | Documents | Searchable fields |
|---|---|---|
| `films` | Film records | title, original_title, director, year |
| `users` | User profiles | username, display_name |
| `posts` | Post bodies (public only) | body, headline |

- Indexing happens async via BullMQ `search.index` job — never synchronously on mutation
- Film search in composer uses Meilisearch (not TMDB API) once db is populated
- TMDB API proxy is fallback during cold-start only

---

## 13. Current Gaps (Ordered by Priority)

1. **Films table** — create ULID-PKed `films` table, migrate `posts.film` JSONB to `film_id` FK
2. **Rename post_saves → post_bookmarks**, update FeedPost type (`saveCount → bookmarkCount`, `isSaved → isBookmarked`)
3. **Follows table** — needed before feed fanout and profile can show follower counts
4. **Denormalized counters** — add `like_count`, `comment_count`, `repost_count`, `bookmark_count` to `posts`
5. **Post visibility** — add `visibility` column to `posts`
6. **Soft deletes** — add `is_deleted` to `posts`, `comments`
7. **BullMQ + Upstash Redis** — wire up `apps/worker`, implement `feed.fanout` and `counter.increment` jobs
8. **Comments table** — needed for core social functionality
9. **Notifications table** — needed for real-time notification bell
10. **Ably wiring** — swap noop transport in `ChatRealtimeProvider`, add notification channel
11. **Feed items table** — needed for hybrid fan-out feed
12. **Meilisearch indexing** — wire up film search
13. **Chat auth** — current chat routes have no `requireAuth`; fix before any production use

---

## 14. Environment Variables (Full List)

### `apps/api/.env`
```env
DATABASE_URL=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=
CORS_ORIGIN=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
R2_PRESIGN_TTL_SECONDS=
CF_IMAGES_ACCOUNT_HASH=
CF_IMAGES_ACCOUNT_ID=
CF_IMAGES_API_TOKEN=
CF_IMAGES_DELIVERY_BASE_URL=
CF_IMAGES_DEFAULT_THUMB_VARIANT=thumb
CF_IMAGES_DEFAULT_FEED_VARIANT=feed
CF_IMAGES_DEFAULT_FULL_VARIANT=full
PORT=
# To add:
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ABLY_API_KEY=
MEILISEARCH_HOST=
MEILISEARCH_API_KEY=
RESEND_API_KEY=
```

### `apps/web/.env.local`
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=
TMDB_API_KEY=
NEXT_PUBLIC_OMDB_API_KEY=
NEXT_PUBLIC_IS_AUTHENTICATED=
NEXT_PUBLIC_MEDIA_READS_PUBLIC=true
# To add:
NEXT_PUBLIC_CHAT_API_MODE=             # 'mock' | 'remote'
NEXT_PUBLIC_CHAT_API_URL=
NEXT_PUBLIC_TENOR_API_KEY=
NEXT_PUBLIC_ABLY_API_KEY=
```

---

## 15. Shared Types (`packages/types`) — Current + Required Changes

### Current (keep):
`UserId`, `PostId`, `ConversationId`, `MessageId`, `PublicUser`, `PublicProfile`, `PrivacySettings`, `NotificationSettings`, `UserSettingsResponse`, `FeedPage`, `ChatPreview`, `ChatMessage`, `HealthResponse`

### Changes needed to FeedPost:
```ts
// RENAME:
saveCount → bookmarkCount
isSaved → isBookmarked

// CHANGE film shape:
film: {
  id: string           // 35mm ULID — NEVER tmdbId
  tmdbId?: number      // optional, for display only
  title: string
  year: number | null
  posterUrl: string | null
  genres: string[]
  rating: number | null
} | null

// ADD to FeedPost:
visibility: 'public' | 'followers_only' | 'private'
isDeleted: boolean
editedAt: string | null
```

### New types to add:
`FilmRef`, `FilmLog`, `FilmList`, `FilmListItem`, `Notification`, `Follow`, `CommunityPreview`, `PaginatedPage<T>` (generic envelope)

---

## 16. V1 Feature Scope

### In V1:
- Auth + onboarding (role picker → favorite films → genres → follow suggestions)
- Profiles (all fields, avatar/cover upload, diary tab with activity heatmap)
- Home feed (algorithmic + following)
- All post types: text, media (9 photos + 1 video + GIFs), discussion, log (film + rating + review + rewatch), poll (2–7 options), quote post, repost
- Comments (max 3 levels)
- Reactions (like on posts + comments)
- Notifications (bundled, real-time via Ably)
- Bookmarks
- Film discovery / film pages / film logging / reviews / lists
- People pages
- Letterboxd import
- User-contributed films
- TMDB integration (cold-start + search)
- Search (users, films, posts)

### Out of V1:
- Short films
- Communities (built but post-V1 launch)
- Festivals
- Push notifications (mobile)
- Chat (built but gated — post-V1)

---

## 17. Onboarding Flow

1. **Role picker** — Cinephile / Creator / Critic / Film Student / Industry + 25-char free text
2. **Favorite films** — pick 5, powered by TMDB search (or Meilisearch once populated)
3. **Favorite genres** — multi-select chip grid
4. **Follow suggestions** — curated list of accounts
5. **Welcome title card** — animated entry

---

## 18. Post Types Reference

| Type | Fields |
|---|---|
| `text` | body |
| `discussion` | headline + body + optional media |
| `log` | film (required) + rating (optional) + review (optional) + rewatch flag |
| `media` | body + up to 9 photos OR 1 video + GIFs (10 files max) |
| `poll` | body + 2–7 options, no media |
| `repost` | ref to original post |
| `quote` | body + ref to quoted post |

---

## 19. Profile Fields Reference

- display name, username (changeable, old handle freed after 30 days)
- avatar, cover photo
- bio, headline (role from picker + 25-char context; Cinephiles show `filmsLoggedCount` instead of free text)
- location, DOB (private), one URL
- favorite films shelf (5 max)
- favorite genres
- Diary tab: GitHub-style activity heatmap + computed stats from logs
