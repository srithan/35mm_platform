# 35mm Platform

This is a modular monorepo scaffold for a production-oriented 35mm social network architecture.

It keeps the product code in one workspace while letting the major runtime surfaces deploy independently:

- `apps/web` - Next.js web frontend copied from `35mm_mvp`.
- `apps/api` - HTTP API service for product data and mutations.
- `apps/worker` - background jobs for feeds, notifications, moderation, and async fanout.
- `packages/types` - shared TypeScript domain contracts.
- `packages/validators` - shared runtime validation schemas.
- `packages/ui` - shared UI primitives for web surfaces.
- `packages/config` - shared TypeScript configuration.

## Why this shape

The goal is not to create a giant single app. The goal is to let a small team move quickly while preserving clean deployment boundaries:

- The copied MVP web app can ship UI independently.
- The API can scale and evolve independently.
- Workers can process expensive async jobs without blocking user requests.
- Shared packages keep contracts consistent without copy-paste.

## First commands

```bash
pnpm install
pnpm dev
```

Run individual surfaces:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

## Growth path

Start with a modular backend in `apps/api`, then split only the parts that truly need independent scaling. Likely future split candidates are feed/ranking, realtime chat, notifications, media processing, search, and moderation.
