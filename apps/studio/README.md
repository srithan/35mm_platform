# 35mm Studio

Internal admin portal for 35mm platform content operations.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form + Zod
- TanStack Table
- Zustand
- Sonner
- Lucide React
- next-themes

## Quick start

```bash
cd 35mm_platform
pnpm install
pnpm dev:studio
```

App runs at `http://localhost:3001`.

The platform API allows this Studio origin in non-production runs. In production, include the deployed Studio origin in the API `CORS_ORIGIN` list before enabling catalog writes.

If Studio uses a separate Clerk application, set API `STUDIO_CLERK_SECRET_KEY` to the same secret as Studio `CLERK_SECRET_KEY`; otherwise protected catalog writes will return `401 Invalid or expired token`.

Direct catalog publish requires the Studio Clerk user to have public or unsafe metadata `studioRole` set to `catalog`, `admin`, or `owner`. Without that role, `/v1/catalog` records the edit as a contribution pending review instead of applying it immediately.

## Environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_key
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_platform_studio_clerk_publishable_key
CLERK_SECRET_KEY=your_platform_studio_clerk_secret_key
```

Use a separate Clerk application for this platform Studio app. Do not copy Clerk keys from the standalone `35mm_studio` app or the public web app.

If external API keys are missing, import fetch buttons will show a message and the search panel remains available for manual entry.

Catalog title list/detail/form/import surfaces call the platform Hono API under `/v1/catalog`. Local browser sessions on `http://localhost:3001` call `http://localhost:4000` directly; deployed/no-env sessions fall back to the Studio `/api/platform/*` server proxy. Reads use public cursor-paged catalog endpoints. Writes require Studio Clerk auth, catalog write role, mutation rate limits, and idempotency keys.

The proxy target defaults to `http://localhost:4000` and can be overridden with `PLATFORM_API_URL`. It must point at the Hono API origin, not Studio. Upstream HTML errors are converted to JSON diagnostics so a wrong target or stale dev route does not surface as a bare browser `404 Not Found`.

## Runtime behavior

- All CRUD operations are asynchronous and use TanStack Query mutations.
- Catalog title writes stage through the catalog mutation/revision pipeline. Shelf surfaces still use the existing Studio shelf store until film-list operations are rewired.
- Route structure:
  - `/dashboard`
  - `/films`
  - `/films/new`
  - `/films/[id]`
  - `/films/[id]/edit`
  - `/shelves`
- `/shelves/new`
- `/shelves/[id]`
- `/import`
- `/settings`

### API key configuration

Create `.env.local` at project root with:

```bash
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_key
```

Both are optional for local development. The external lookup UI gracefully disables actions and shows explicit hints when keys are missing.

## Next phase

Rewire shelf operations and contribution review flows to the same production catalog/list API patterns.

## Production migration notes

- Keep catalog title writes on `/v1/catalog` so edits remain revisioned and revertible.
- Move remaining shelf store behavior to API-backed repositories.
- Keep Clerk Studio roles aligned with API catalog write authorization.
