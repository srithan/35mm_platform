# 35mm Platform

35mm is a social film platform inspired by conversation-first apps for filmmakers, film lovers, and critics. The repository is a **production-oriented monorepo** built to ship quickly while preserving strict ownership boundaries between product surfaces (web, API, worker), data contracts, and background systems.

## What this repository contains

- `apps/web` — Next.js 15 app for the user-facing product.
- `apps/api` — Hono-based Node API.
- `apps/worker` — BullMQ workers for asynchronous background jobs.
- `packages/types` — shared TypeScript domain and response contracts.
- `packages/validators` — shared Zod schemas and input parsing.
- `packages/db` — Drizzle schema and database helpers.
- `packages/ui` — shared UI primitives.
- `packages/config` — shared TS/tooling config.

## Product goals

1. Build a social discovery flow around films, posts, comments, and follow networks.
2. Keep user actions fast (sync path) while offloading heavy work to background jobs.
3. Keep long-term scale possible without refactors at the monorepo boundaries.
4. Preserve strong type-safety between frontend and backend.
5. Ship iterative feature work while keeping operational blast radius low.

## Tech stack

- Frontend: Next.js 15 (App Router), React 18, Tailwind CSS, TanStack Query v5, Zustand v5, Clerk, Framer Motion.
- API: Hono (Node), TypeScript, JWT/session auth via Clerk middleware.
- DB: PostgreSQL on Neon, Drizzle ORM.
- Queue/Cache: Upstash Redis, BullMQ.
- Realtime: Ably.
- Media/storage: Cloudflare R2 (+ Stream + Images planned/in-progress).
- Search: Meilisearch (planned integration).
- Mail: Resend.
- Deploy model: Vercel for web + API, dedicated worker host for `apps/worker`.

See `AGENTS.md` and architecture docs for the authoritative source-of-truth stack list.

## Current platform state (as of now)

- Wired: auth, profiles, media presign, feed + posts + likes, notifications surface, settings.
- In progress / partially wired:
  - search
  - comments
  - follows
  - notifications realtime publish path
  - worker media and fanout jobs
- Planned:
  - film identity migration (35mm ULID as canonical ID) and stricter schema transitions
  - richer moderation/realtime workflows

## Core architecture decisions

- Pagination: cursor-based everywhere (`createdAt,id` style cursors), no offset pagination.
- Counters: denormalized counts in `posts` and related tables (async updates), no `COUNT()` in normal read paths.
- Soft deletes: boolean `isDeleted` where applicable instead of destructive deletes.
- Visibility: `public | followers_only | private` for posts.
- Notifications: event-bundling and async publish path.
- Realtime consistency: optimistic UI updates + background invalidation/revalidation.

## Developer setup

### 1) Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL URL (Neon)
- Redis for BullMQ and cache (Upstash preferred)

### 2) Install

```bash
pnpm install
```

### 3) Environment variables (detailed)

Use the provided examples as a starting point, then fill required values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Important: `apps/worker` does not currently have its own `.env.example` and is launched with `--env-file=../api/.env` from `apps/worker/package.json`. In practice, Worker reads many of the same keys from `apps/api/.env`.

#### apps/api/.env (required for API and worker process)

| Variable | Required | Purpose | Notes |
|---|---|---|---|
| `DATABASE_URL` | required | Neon PostgreSQL connection | Must use pooled or transaction-safe Neon URL |
| `CLERK_SECRET_KEY` | required | API auth verification/webhooks | Must match Clerk project |
| `CLERK_PUBLISHABLE_KEY` | required | API-side Clerk checks + compatibility | Required by code-level loadEnv contract |
| `CLERK_WEBHOOK_SECRET` | required | Clerk webhook validation | Required for profile/session webhook routes |
| `R2_ACCOUNT_ID` | optional | Media upload presign fallback | Default empty string in API runtime |
| `R2_ACCESS_KEY_ID` | optional | Media upload presign fallback | Default empty string in API runtime |
| `R2_SECRET_ACCESS_KEY` | optional | Media upload presign fallback | Default empty string in API runtime |
| `R2_BUCKET` | optional | Bucket selection | Defaults to `35mm-media` |
| `R2_PUBLIC_BASE_URL` | optional | Public media URL building | Optional in API, required by worker |
| `R2_PRESIGN_TTL_SECONDS` | optional | Presign window in seconds | Defaults to `900` |
| `UPSTASH_REDIS_URL` | optional | BullMQ producer/consumer transport | Recommended for worker + queue flow |
| `UPSTASH_REDIS_REST_URL` | optional | Redis REST client (cache usage) | Recommended for web/API cache calls |
| `UPSTASH_REDIS_REST_TOKEN` | optional | Redis REST auth | Required with REST endpoint |
| `CF_IMAGES_*` | optional | Optional Cloudflare Images integration | Safe to leave blank if not enabled |
| `CF_IMAGES_DEFAULT_*_VARIANT` | optional | Optional image variants | Defaults to `public` |
| `ABLY_API_KEY` | optional | Notification publish (server side) | Required for future realtime path in API |
| `RATE_LIMIT_DISABLED` | optional | Toggle request limiting | Set to `true` only in local dev |
| `CORS_ORIGIN` | optional | API CORS allowed origin | Defaults to `http://localhost:3000` |
| `PORT` | optional | API listen port | Defaults to `4000` |

#### apps/web/.env.local (required for web)

| Variable | Required | Purpose |
|---|---|---|
| `TMDB_API_KEY` | recommended | All TMDB-backed discover/title/listing pages |
| `NEXT_PUBLIC_API_URL` | required for API-dependent flows | Base URL used by web API client |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | required | Clerk browser auth/session UI |
| `CLERK_SECRET_KEY` | required for server/runtime auth actions | Some server routes rely on this value |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | optional | Custom sign-in route (default `/login`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | optional | Custom sign-up route (default `/signup`) |
| `NEXT_PUBLIC_IS_AUTHENTICATED` | optional | Temporary local auth bypass flag |
| `NEXT_PUBLIC_MEDIA_READS_PUBLIC` | optional | Toggle media URL read behavior for local dev |
| `NEXT_PUBLIC_ABLY_API_KEY` | optional | Realtime client key (notifications) |
| `NEXT_PUBLIC_OMDB_API_KEY` | optional | Optional metadata fallback in film cards |
| `NEXT_PUBLIC_CHAT_API_MODE` | optional | Chat subsystem mode: `mock` or `remote` |
| `NEXT_PUBLIC_CHAT_API_URL` | optional | Required only when chat mode is `remote` |
| `NEXT_PUBLIC_TENOR_API_KEY` | optional | GIF picker in chat composer |

#### apps/worker environment in practice

`apps/worker/src/lib/env.ts` loads these keys:

- required: `DATABASE_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`
- recommended: `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- tuning: `WORKER_CONCURRENCY` (default `4`), `MEDIA_JOB_BATCH_SIZE` (default `20`), `MEDIA_BACKFILL_BATCH_SIZE` (default `100`)

Add these to `apps/api/.env` so `pnpm dev:worker` inherits them.

### 4) Environment verification checklist

Use these checks while developing:

1. API boot sanity:
   - Run `pnpm dev:api`
   - Confirm it starts on `http://localhost:4000`
2. Worker boot sanity:
   - Run `pnpm dev:worker`
   - Confirm it starts and no env-parse exception appears
3. Web boot sanity:
   - Run `pnpm dev:web`
   - Confirm it starts on `http://localhost:3000`
4. Cross-app sanity:
   - Open `http://localhost:3000`
   - Verify network calls target `NEXT_PUBLIC_API_URL`
   - Verify `Auth`, `media upload`, and `feed` actions do not fail on missing envs

If startup fails immediately with "Missing required environment variable", that is the first item to fix before touching code.

### 5) Database / schema workflow

```bash
cd packages/db
npx drizzle-kit generate
npx drizzle-kit migrate
```

> Note: migration commands may be mirrored by the project-specific tooling/scripts; check package scripts before running destructive operations.

## Development commands

From repo root:

```bash
pnpm install
pnpm dev              # runs web + api + worker in parallel
pnpm dev:web          # run Next.js only
pnpm dev:api          # run API only
pnpm dev:worker       # run worker only
pnpm build            # build all apps/packages with build scripts
pnpm typecheck        # typecheck all packages
pnpm lint            # lint/typecheck in all packages
```

Per-app scripts are in each app package (`apps/web`, `apps/api`, `apps/worker`).

## Request/response contract discipline

Shared contracts are a hard requirement:

- API response types come from `packages/types`.
- Request payload parsing/validation lives in `packages/validators`.
- Frontend code should not duplicate model shapes when a canonical contract exists.
- API/worker changes should keep backward compatibility when possible, and include migration notes when changing payload shape.

## Folder map (high-value files)

- `apps/web/features/...` — feature-organized frontend domain slices.
- `apps/api/src/modules/...` — route modules by domain.
- `apps/worker/src/workers` — queue consumers and job runners.
- `packages/db/src/schema` — database schema sources.
- `packages/types/src` — API contracts.
- `packages/validators/src` — zod schemas.

## Local workflow and style expectations

- Keep UI files focused and local to feature folders.
- Prefer explicit typing and narrow interfaces over `any`.
- Preserve existing app conventions for query keys, optimistic updates, and pagination.
- Prefer small, composable utility functions over large inline component logic.
- Use existing shared primitives where available before adding ad-hoc equivalents.
- Add tests for non-trivial behavior changes when practical; keep behavior parity in API and worker updates.

## Build and release notes

- Production path:
  - `apps/web` built as Next.js App Router app.
  - `apps/api` built as TypeScript Node output (`dist`).
  - `apps/worker` built and deployed as a long-running consumer.
- Avoid changing API contracts in web without updating backend and worker paths that consume those payloads.

## Troubleshooting

- If frontend cannot call API, verify `NEXT_PUBLIC_API_URL` and CORS in `apps/api`.
- If follow/comments/feeds silently fail, confirm queue env vars and worker process health.
- If build fails on type checks, read the first reported file and work in one pass before re-running full builds.

## Contributing

1. Pull latest `main`.
2. Run `pnpm install` and required env files.
3. Implement scoped changes (prefer small, focused diffs).
4. Run relevant checks (`pnpm build`, `pnpm lint`, `pnpm typecheck`).
5. Link related schema/API/frontend updates together in one PR.
6. Verify background-worker side effects when touching follow/feed/notification logic.

## License

Project-specific license is not publicized in this repository snapshot.
