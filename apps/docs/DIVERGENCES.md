# Source divergences and unconfirmed contracts

Generated reference reads API route declarations, Zod validators, shared DTOs, Drizzle exports, SQL migrations, and latest Drizzle snapshot. Entries below remain incomplete. Do not generate production clients from them without checking handlers and serializers.

## Confirmed differences from drafts

- `docs/catalog/api-reference.md` omits `GET /v1/catalog/titles/by-slug/:slug`, `GET /v1/catalog/people/by-slug/:slug`, and `POST /v1/catalog/people/resolve`. These routes exist in `apps/api/src/modules/catalog/routes.ts`.
- Requested guide premise said auth is not required yet. Actual `requireAuth` middleware protects many routes, and `chatRoutes.use("*", requireAuth)` protects all chat routes. Operation security follows source.
- Requested pagination premise says cursors are opaque base64url. Chat message pagination uses a `before` time UUID; `apps/api/src/modules/chat/routes.ts` and shared chat DTOs are source.
- `apps/api/src/routes/poster-proxy.ts` returns plain-text 400/403/502 errors and binary success. Global JSON `{ code, message }` contract does not cover that route.

## Migration/schema cross-check

- All 58 exported Drizzle tables have SQL `CREATE TABLE` migrations. All 69 SQL files appear in Drizzle journal. Latest `0068_snapshot.json` matches current Drizzle column names, types, and nullability in automated comparison. This checks repository state, not deployed database migration state.
- Table pages show index keys and partial WHERE from latest snapshot. The one-line usage descriptions are derived from key order/uniqueness; application query plan and write cost still need review.

## Needs confirmation: API contracts

Generated operation status codes come from direct `c.json`/`c.body`/`c.text` calls and direct error helpers. Helpers and services can add more errors. Direct table references omit service-layer access. Example pairs are omitted where real wire values have not been verified.

### auth (1)

- GET /v1/me: response serializer or expression needs manual schema verification

### catalog (2)

- POST /v1/catalog/people/resolve: response serializer or expression needs manual schema verification
- POST /v1/catalog/merge: body parsed without shared Zod validator; manual shape review

### chat (3)

- PATCH /v1/chat/threads/{threadId}/read: body parsed without shared Zod validator; manual shape review
- PATCH /v1/chat/threads/{threadId}/archive: body parsed without shared Zod validator; manual shape review
- PATCH /v1/chat/threads/{threadId}/mute: body parsed without shared Zod validator; manual shape review

### contributions (2)

- POST /v1/contributions/submissions: response serializer or expression needs manual schema verification
- GET /v1/contributions/submissions: response serializer or expression needs manual schema verification

### email (2)

- GET /v1/email/unsubscribe: response serializer or expression needs manual schema verification
- POST /v1/email/unsubscribe: response serializer or expression needs manual schema verification

### feed (22)

- GET /v1/feed: response serializer or expression needs manual schema verification
- POST /v1/feed: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- GET /v1/feed/posts/{postId}: response serializer or expression needs manual schema verification
- GET /v1/feed/posts/{postId}/quotes: response serializer or expression needs manual schema verification
- GET /v1/feed/films/{filmId}/reviews: response serializer or expression needs manual schema verification
- GET /v1/feed/profiles/{username}/posts: response serializer or expression needs manual schema verification
- GET /v1/feed/bookmarks: response serializer or expression needs manual schema verification; validator location needs manual verification
- PATCH /v1/feed/posts/{postId}: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- POST /v1/feed/posts/{postId}/poll/votes: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- POST /v1/feed/posts/{postId}/likes: response serializer or expression needs manual schema verification
- DELETE /v1/feed/posts/{postId}/likes: response serializer or expression needs manual schema verification
- GET /v1/feed/bookmarks/folders: response serializer or expression needs manual schema verification
- POST /v1/feed/bookmarks/folders: response serializer or expression needs manual schema verification
- PATCH /v1/feed/bookmarks/folders/{folderId}: response serializer or expression needs manual schema verification
- POST /v1/feed/posts/{postId}/bookmarks: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification; validator location needs manual verification
- PATCH /v1/feed/posts/{postId}/bookmarks: response serializer or expression needs manual schema verification
- DELETE /v1/feed/posts/{postId}/bookmarks: response serializer or expression needs manual schema verification
- POST /v1/feed/posts/{postId}/comments/{commentId}/likes: response serializer or expression needs manual schema verification
- DELETE /v1/feed/posts/{postId}/comments/{commentId}/likes: response serializer or expression needs manual schema verification
- GET /v1/feed/posts/{postId}/comments: response serializer or expression needs manual schema verification
- POST /v1/feed/posts/{postId}/comments: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- PATCH /v1/feed/posts/{postId}/comments/{commentId}: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification

### films (4)

- GET /v1/films: response serializer or expression needs manual schema verification
- POST /v1/films/resolve: response serializer or expression needs manual schema verification
- GET /v1/films/tmdb/{tmdbId}: response serializer or expression needs manual schema verification
- GET /v1/films/{id}: response serializer or expression needs manual schema verification

### follows (5)

- POST /v1/follows/{userId}: response serializer or expression needs manual schema verification
- DELETE /v1/follows/{userId}: response serializer or expression needs manual schema verification
- POST /v1/follows/{userId}/accept: response serializer or expression needs manual schema verification
- GET /v1/follows/requests/received: response serializer or expression needs manual schema verification
- DELETE /v1/follows/{userId}/request: response serializer or expression needs manual schema verification

### lists (12)

- GET /v1/lists: response serializer or expression needs manual schema verification
- GET /v1/lists/profile/{username}: response serializer or expression needs manual schema verification
- GET /v1/lists/films/{filmId}: response serializer or expression needs manual schema verification
- GET /v1/lists/me/watchlist: response serializer or expression needs manual schema verification
- POST /v1/lists/films/resolve: response serializer or expression needs manual schema verification
- GET /v1/lists/{listId}: response serializer or expression needs manual schema verification
- POST /v1/lists: response serializer or expression needs manual schema verification
- PATCH /v1/lists/{listId}: response serializer or expression needs manual schema verification
- POST /v1/lists/{listId}/entries: response serializer or expression needs manual schema verification
- POST /v1/lists/{listId}/clone: response serializer or expression needs manual schema verification
- GET /v1/lists/watchlist/films/{filmId}: response serializer or expression needs manual schema verification
- POST /v1/lists/watchlist/films: response serializer or expression needs manual schema verification

### media (3)

- POST /v1/media/presign: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- GET /v1/media/resolve-url: response serializer or expression needs manual schema verification
- GET /v1/media/oembed: response serializer or expression needs manual schema verification

### moderation (8)

- POST /v1/reports: response serializer or expression needs manual schema verification
- GET /v1/me/reports: response serializer or expression needs manual schema verification
- GET /v1/me/reports/{reportId}: response serializer or expression needs manual schema verification
- GET /v1/admin/moderation/queue: response serializer or expression needs manual schema verification
- GET /v1/admin/moderation/content/{contentType}/{contentId}: response serializer or expression needs manual schema verification
- POST /v1/admin/moderation/content/{contentType}/{contentId}/action: response serializer or expression needs manual schema verification
- POST /v1/admin/moderation/content/{contentType}/{contentId}/dismiss: response serializer or expression needs manual schema verification
- GET /v1/admin/moderation/users/{userId}/strikes: response serializer or expression needs manual schema verification

### notifications (2)

- GET /v1/me/notifications: response serializer or expression needs manual schema verification
- POST /v1/me/notifications/read-all: response serializer or expression needs manual schema verification

### onboarding (4)

- GET /v1/me/onboarding-status: response serializer or expression needs manual schema verification
- POST /v1/onboarding/films/resolve: response serializer or expression needs manual schema verification
- POST /v1/me/onboarding: response serializer or expression needs manual schema verification
- GET /v1/onboarding/suggestions: response serializer or expression needs manual schema verification

### profiles (7)

- GET /v1/profiles/search: response serializer or expression needs manual schema verification
- GET /v1/profiles/{username}: response serializer or expression needs manual schema verification
- GET /v1/profiles/{username}/stats: response serializer or expression needs manual schema verification
- PATCH /v1/profiles/me: response serializer or expression needs manual schema verification
- GET /v1/profiles/{username}/followers: response serializer or expression needs manual schema verification
- GET /v1/profiles/{username}/following: response serializer or expression needs manual schema verification
- GET /v1/profiles/{username}/follow-requests: response serializer or expression needs manual schema verification

### search (1)

- GET /v1/search: response serializer or expression needs manual schema verification

### settings (7)

- GET /v1/me/settings: response serializer or expression needs manual schema verification
- PATCH /v1/me/settings/privacy: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- PATCH /v1/me/settings/notifications: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- PATCH /v1/me/settings/profile: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification; validator location needs manual verification
- PATCH /v1/me/settings/appearance: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- PATCH /v1/me/settings/media: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification
- PATCH /v1/me/settings/streaming-services: body parsed without shared Zod validator; manual shape review; response serializer or expression needs manual schema verification

### users (2)

- GET /v1/me/blocks: response serializer or expression needs manual schema verification
- GET /v1/me/mutes: response serializer or expression needs manual schema verification

### videos (9)

- POST /v1/videos/uploads: response serializer or expression needs manual schema verification
- POST /v1/videos/{id}/complete: response serializer or expression needs manual schema verification
- GET /v1/videos/{id}/status: response serializer or expression needs manual schema verification
- POST /v1/videos/{id}/refresh: response serializer or expression needs manual schema verification
- POST /v1/videos/webhook/{libraryId}: validator location needs manual verification
- GET /v1/videos/films: response serializer or expression needs manual schema verification
- GET /v1/videos/films/{filmId}: response serializer or expression needs manual schema verification
- POST /v1/videos/{id}/publish: response serializer or expression needs manual schema verification
- GET /v1/videos/{id}/playback: response serializer or expression needs manual schema verification

### webhooks (1)

- POST /v1/webhooks/clerk: Clerk event-specific request variants are external and need confirmation. Handler verifies Svix signature, then reads `event.type` and `event.data`.

## Code sample targets

- Scalar UI verified Shell/cURL, JavaScript Fetch, Swift NSURLSession, and Kotlin OkHttp. JavaScript Fetch code is valid TypeScript syntax; Scalar does not expose a separately named TypeScript Fetch target.

## Realtime

- `x-35mm-realtime-events` in OpenAPI contains exact published event names and field schemas from API and worker publishers. `thread.updated` uses the same payload shape for message and reaction activity; clients must refetch after reconnect.
