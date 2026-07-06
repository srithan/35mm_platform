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

## Environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_platform_studio_clerk_publishable_key
CLERK_SECRET_KEY=your_platform_studio_clerk_secret_key
```

Use a separate Clerk application for this platform Studio app. Do not copy Clerk keys from the standalone `35mm_studio` app or the public web app.

If external API keys are missing, import fetch buttons will show a message and the search panel remains available for manual entry.

Data is not persisted to a backend in this build. Records are stored in browser `localStorage` and restored across reloads.

### Local keys

- Films: `35mm-studio-films`
- Shelves: `35mm-studio-shelves`

## Local persistence

Data is seeded in localStorage under:

- `35mm-studio-films`
- `35mm-studio-shelves`

This is intentionally mock-only for now; no backend is connected.

## Runtime behavior

- All CRUD operations are asynchronous and use TanStack Query mutations.
- Film and shelf changes are optimistically written through local storage.
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

Hook this API layer to a real database and authenticate this portal to production services.

## Production migration notes

- Move `lib/data/*Store.ts` to API-backed repositories.
- Replace `localStorage` reads/writes with a server API and update TanStack Query hooks.
- Add role-based auth and action auditing.
