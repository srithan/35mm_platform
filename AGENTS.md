# 35mm — Agent Context

Social film platform (Letterboxd × Twitter). Target scale: 35M+ users.
Full architecture doc: `docs/architecture.md`

---

## Monorepo (Turborepo + pnpm)

```
apps/web      → Next.js 15 App Router (Vercel)
apps/api      → Hono REST API (Vercel / Node)
apps/worker   → BullMQ background jobs (long-running Node)
packages/db   → Drizzle schema + Neon client (source of truth)
packages/types       → Shared TypeScript contracts
packages/validators  → Shared Zod schemas
packages/ui          → Shared React primitives
packages/config      → Shared TS config
```

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15, React 18, Tailwind, React Query v5, Zustand v5, Clerk, Framer Motion |
| API | Hono (not tRPC — native Swift/Kotlin support required) |
| DB | Neon (Postgres) + Drizzle ORM |
| Auth | Clerk (native SDKs, `verifyToken` on API) |
| Queue | BullMQ + Upstash Redis |
| Cache | Upstash Redis |
| Realtime | Ably |
| Media | Cloudflare R2 (storage) + Stream (video) + Images (optimization) |
| Search | Meilisearch |
| Email | Resend |
| Deploy | Vercel (web + api), long-running Node (worker) |

---

## Film DB Rules — Never Violate

- 35mm DB is always primary. TMDB is cold-start fallback only.
- Film PKs = **ULIDs**. `imdb_id` and `tmdb_id` are unique indexes, never PKs.
- Film URLs use the 35mm ULID — never TMDB ID.
- Single `films` table with `source`: `35mm | tmdb_import | user_contributed`
- `FilmRef.id` in all types and API responses = 35mm ULID. **Never `tmdbId`.**
- TMDB API proxy (`/api/tmdb/*`) is for search autocomplete only, not film identity.

---

## Architecture Decisions

- **Pagination:** cursor-based everywhere. No OFFSET, ever.
- **Counters:** denormalized on `posts` (`like_count`, `comment_count`, etc.). Updated async via BullMQ. Never COUNT() at read time.
- **Feed:** hybrid fan-out. Write fan-out for users with < 10K followers (push to `feed_items`). Read fan-out for ≥ 10K (pull at query time).
- **Soft deletes:** `is_deleted` boolean on all user-generated content. Never hard delete.
- **Ratings:** stored as `smallint` 1–10 in DB. Half-stars rendered in UI only.
- **Comments:** max 3 levels deep, enforced in app layer.
- **Notifications:** bundled, real-time via Ably.
- **Username changes:** allowed. Old handle freed after 30 days.
- **Post visibility:** `public | followers_only | private` from day one.
- **Posts:** editable with edit history stored in `post_edits`.

---

## State Management

- **Server state** (anything from the DB) → React Query only. Never duplicate in Zustand.
- **Client/UI state** (composer open, modals, sidebar) → Zustand only.
- Optimistic updates on all mutations (likes, bookmarks, reposts, follows).
- Query key factories in `features/*/hooks/queryKeys.ts` — never ad-hoc strings.

---

## Frontend Conventions

- **Always light mode** unless user has explicitly set a theme preference.
- Fonts: DM Serif Display (headings), DM Sans (body), DM Mono (counters/code).
- Accent: `#c2473a` (warm red).
- Feed max-width: 640px centered.
- `PostCard` must be memoized (`React.memo`) — renders N times per feed.
- Heavy components (emoji picker, GIF picker, film search) → dynamic import.

---

## Pending — Do Before Writing API Contract

- [ ] Rename `post_saves` table → `post_bookmarks`
- [ ] Rename `FeedPost.saveCount` → `bookmarkCount`, `isSaved` → `isBookmarked`
- [ ] `FilmRef.id` must be 35mm ULID everywhere in `packages/types` (currently uses `tmdbId`)
- [ ] Migrate `posts.film` JSONB column → `film_id` FK after `films` table exists

---

## What's Real vs Stub

| Thing | Status |
|---|---|
| Auth (Clerk) | ✅ Wired |
| Profiles CRUD | ✅ Wired |
| Media presign (R2) | ✅ Wired |
| Feed + posts + likes | ✅ Wired |
| Settings | ✅ Wired |
| Clerk webhooks | ✅ Wired |
| Films table | ⬜ Does not exist yet |
| Follows | ⬜ Does not exist yet |
| Comments | ⬜ Does not exist yet |
| Notifications | ⬜ Mock only |
| BullMQ / Redis | ⬜ Worker is log-only stubs |
| Ably realtime | ⬜ Noop transport stub |
| Meilisearch | ⬜ Not wired |
| Chat (backend) | ⚠️ 3 of ~10 routes, no auth |
| Cloudflare Stream | ⬜ Not wired |
