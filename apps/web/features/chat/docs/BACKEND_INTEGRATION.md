# Chat: Backend integration guide

This document is for **backend engineers** and **full-stack integrators** wiring the 35mm Next.js chat UI to a real API. The frontend expects a **`ChatApiClient`** contract (see `features/chat/api/ChatApiClient.ts`). The default HTTP adapter is **`createRemoteChatClient`** (`features/chat/api/remoteChatClient.ts`).

---

## Table of contents

1. [Switching the app from mock to remote](#1-switching-the-app-from-mock-to-remote)
2. [Authentication](#2-authentication)
3. [Base URL and path prefix](#3-base-url-and-path-prefix)
4. [REST API specification](#4-rest-api-specification)
5. [Request and response shapes](#5-request-and-response-shapes)
6. [Pagination semantics](#6-pagination-semantics)
7. [Folders: inbox, archived, requests](#7-folders-inbox-archived-requests)
8. [Idempotency for sends](#8-idempotency-for-sends)
9. [Errors](#9-errors)
10. [Realtime (WebSocket / SSE)](#10-realtime-websocket--sse)
11. [Performance and scale checklist](#11-performance-and-scale-checklist)
12. [Deviating from the default paths](#12-deviating-from-the-default-paths)

---

## 1. Switching the app from mock to remote

Environment variables (also listed in repo root `.env.example`):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CHAT_API_MODE` | Omit = HTTP backend. Set to **`mock`** only for local demos/tests. |
| `NEXT_PUBLIC_CHAT_API_URL` | Optional API origin override without trailing slash, e.g. `https://api.35mm.in`. Falls back to `NEXT_PUBLIC_API_URL`. |

The browser calls:

`{NEXT_PUBLIC_CHAT_API_URL}` + `/v1/chat` + *resource path* (see `features/chat/config/runtimeConfig.ts` → `CHAT_HTTP.restPrefix`).

If no chat-specific API URL is set, the client uses `NEXT_PUBLIC_API_URL`.

---

## 2. Authentication

The HTTP layer (`features/chat/api/http.ts`) attaches:

```http
Authorization: Bearer <token>
```

when **`setChatAuthGetToken`** (`features/chat/api/getChatApiClient.ts`) returns a non-empty string.

**Integration step:** early in the app (e.g. inside your auth provider wrapper, after session is ready):

```ts
import { setChatAuthGetToken } from "@/features/chat/api/getChatApiClient";

setChatAuthGetToken(function () {
  return getYourAccessToken(); // sync or Promise<string | null>
});
```

Return **`null`** when logged out. Individual hooks can later use `enabled: false` when there is no session (recommended follow-up).

**Cookies-only APIs:** if you use cookie sessions with no Bearer token, either (a) issue a short-lived JWT for the browser to send on `Authorization`, or (b) fork `chatHttpJson` / `createRemoteChatClient` to use `credentials: "include"` and omit Bearer (CORS must allow credentials).

---

## 3. Base URL and path prefix

- **Configurable today:** `NEXT_PUBLIC_CHAT_API_URL` (origin only).
- **Prefix fixed in code:** `/v1/chat` (`CHAT_HTTP.restPrefix`).

Full URL example:

`https://api.35mm.in/v1/chat/conversations?folder=inbox&limit=40`

To use `/api/v2/messages` instead, change `CHAT_HTTP.restPrefix` and/or **`createRemoteChatClient`** path strings in one place.

---

## 4. REST API specification

All success responses should return **`Content-Type: application/json`** (except `204` with empty body where noted).

### 4.1 List conversations

```http
GET /v1/chat/conversations?folder={inbox|archived|requests}&limit={n}&cursor={opaque}
```

**Response (200):** `PaginatedConversations` (camelCase JSON):

```json
{
  "items": [ /* ChatPreview */ ],
  "nextCursor": "string-or-null",
  "hasMore": true
}
```

### 4.2 List messages (paginated)

```http
GET /v1/chat/conversations/{chatId}/messages?limit={n}&cursor={opaque}&direction={before|after}
```

**Response (200):** `PaginatedMessages`:

```json
{
  "items": [ /* ChatMessage */ ],
  "nextCursor": "string-or-null",
  "hasMore": true
}
```

### 4.3 Send message

```http
POST /v1/chat/conversations/{chatId}/messages
Idempotency-Key: <uuid>   (recommended; frontend sends this)
Content-Type: application/json
```

**Body:** `ChatSendPayload`:

| Field | Type | Notes |
|-------|------|--------|
| `text` | string | May be empty if media/file present |
| `replyToId` | string? | Parent message id |
| `gifUrl` | string? | Tenor (or CDN) URL |
| `imageDataUrl` | string? | Data URL for inline image (consider replacing with upload URL in production) |
| `file` | `{ name, sizeLabel? }`? | Metadata only today; real uploads should move to presigned URLs + attachment ids |

**Response (200):** `SendMessageResult`:

```json
{ "message": { /* ChatMessage */ } }
```

### 4.4 Toggle reaction

```http
POST /v1/chat/conversations/{chatId}/messages/{messageId}/reactions
Content-Type: application/json

{ "emoji": "👍" }
```

**Preferred response:** updated `ChatMessage` with hydrated `reactions`.

The web adapter applies an optimistic chip immediately and then replaces that
cache row with this authoritative message response. Avoid an extra refetch per
reaction on hot threads.

The adapter also tolerates `204` / empty success for older deployments and keeps
the optimistic cache patch in place.

### 4.5 Delete message

```http
DELETE /v1/chat/conversations/{chatId}/messages/{messageId}
```

**Response:** `200` or `204`.

### 4.6 Mark conversation read

```http
POST /v1/chat/conversations/{chatId}/read
```

**Response:** `200` or `204`.

### 4.7 Archive / unarchive

```http
PATCH /v1/chat/conversations/{chatId}
Content-Type: application/json

{ "archived": true }
```

### 4.8 Delete conversation

```http
DELETE /v1/chat/conversations/{chatId}
```

### 4.9 Message request (optional)

```http
POST /v1/chat/conversations/{chatId}/request
Content-Type: application/json

{ "action": "accept" | "decline" }
```

Implemented on **`ChatApiClient`** as optional **`respondToConversationRequest`**. The remote client includes it; the mock client omits it (hook **`useRespondToConversationRequest`** no-ops if missing).

---

## 5. Request and response shapes

Domain types live in **`features/chat/types.ts`**. The backend should return JSON that **hydrates** these shapes (camelCase keys to match TypeScript).

### `ChatPreview`

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `id` | string | yes | Stable conversation id |
| `name` | string | yes | Display name |
| `username` | string | yes | Handle (often with `@`) |
| `lastMessage` | string | yes | Preview snippet |
| `lastMessageAt` | string | yes | Short relative label (e.g. `2m`, `1h`) — server may send ISO and let client format later |
| `unread` | number | no | Badge |
| `avatarUrl` | string \| null | no | Small profile avatar URL for list/header rendering |
| `avatarBg` | string | yes | CSS color / hex for avatar circle |
| `avatarColor` | string | yes | Text color on avatar |
| `archived` | boolean | no | `true` → archived folder only |
| `isPendingRequest` | boolean | no | `true` + not archived → requests folder |

### `ChatMessage`

| Field | Type | Notes |
|-------|------|--------|
| `id` | string | |
| `chatId` | string | |
| `text` | string | |
| `isOwn` | boolean | **Server must set** relative to authenticated user |
| `createdAt` | string | ISO 8601 |
| `status` | enum? | `sending` \| `sent` \| `delivered` \| `read` — mainly for own messages |
| `senderAvatarUrl` | string \| null | optional sender avatar URL for incoming message runs |
| `editedAt` | string \| null | set after successful message edits |
| `replyTo` | object? | `id`, `snippet`, `isOwn` |
| `reactions` | array? | `emoji`, `count`, `includesMe` |
| `media` | object? | `type`: `gif` \| `image`, `url` |
| `file` | object? | `name`, `sizeLabel?` |

---

## 6. Pagination semantics

### Conversations

- **`cursor`**: opaque string from previous **`nextCursor`**; omit on first page.
- **`limit`**: max items (frontend default **`CHAT_PAGE_LIMITS.conversations`** = 40).
- **`hasMore`**: if true, client may request next page (UI for infinite list can be added later).

### Messages

- **`direction=before`** (default for “load older”): return messages **older** than the cursor (or newest window if `cursor` omitted). Frontend expects **`items` in chronological order** (oldest → newest within the returned window).
- **`direction=after`**: return messages **newer** than cursor (catch-up / gap fill).

**`nextCursor`:** cursor the client should pass for the **next** page in the **same** direction.

The hook **`useChatMessagesInfinite`** merges pages by concatenating older pages before newer ones; your API should stay consistent with the above so ordering is correct.

---

## 7. Folders: inbox, archived, requests

| `folder` | Intended membership |
|----------|---------------------|
| `inbox` | Active, **non-archived** conversations (product may include pending requests here for “All” UX). |
| `archived` | `archived === true`. |
| `requests` | `isPendingRequest === true` and typically not archived. |

The mobile **All** tab maps to **inbox**. **Requests** maps to **requests**. **Archived** maps to **archived**.

---

## 8. Idempotency for sends

The frontend sends **`Idempotency-Key`** (UUID when `crypto.randomUUID` exists) on **`POST .../messages`**. The backend should:

- Store keys per user (or per device) for a TTL (e.g. 24h).
- On duplicate key + same body, return the **same** `message` as the first call (HTTP 200).

This prevents double messages on flaky networks.

---

## 9. Errors

### HTTP status

- **`4xx`:** client errors; TanStack Query surfaces as error state (retry policy skips most 4xx except **`429`**).
- **`5xx` / network:** retried with exponential backoff (see `CHAT_QUERY_POLICY` in `runtimeConfig.ts`).

### Body shape (recommended)

```json
{
  "message": "Human-readable message",
  "code": "machine_code"
}
```

The client maps this to **`ChatApiError`** (`features/chat/api/errors.ts`) with **`status`**, **`code`**, **`details`**.

Optional headers for support: **`X-Request-Id`**, **`CF-Ray`**, etc. (read for logging).

---

## 10. Realtime (WebSocket / SSE)

The UI mounts **`ChatRealtimeProvider`** (`app/providers.tsx`) and automatically builds an Ably transport when **`NEXT_PUBLIC_ABLY_API_KEY`** and a signed-in **`userId`** are available. API and worker **`ABLY_API_KEY`** values publish backend events; the web app also needs **`NEXT_PUBLIC_ABLY_API_KEY`** so the browser can subscribe.

The provider subscribes to:

- **`user:{userId}:inbox`** for `thread.updated`, which patches cached chat preview rows and unread counts before invalidating conversation queries.
- **`thread:{threadId}`** for the active `/chat/[chatId]` route and maps `message.new`, `message.edited`, `message.deleted`, `message.reaction`, `message.read`, and `typing.update`.

If the web Ably key is missing, the provider falls back to a **noop** transport. Tests or alternate realtime implementations can still pass **`transport`** into **`<ChatRealtimeProvider transport={...}>`**.

### Event contract

See **`features/chat/realtime/types.ts`** — union **`ChatRealtimeEvent`**:

- `message.created` / `message.updated` — includes full **`ChatMessage`**
- `message.deleted` — `chatId`, `messageId`
- `conversation.updated` — full **`ChatPreview`**
- `conversation.patch` — partial inbox preview update from `thread.updated`
- `conversation.deleted` — `chatId`
- `typing`, `read_receipt` — held as ephemeral provider state for live typing bubbles and last-own-message seen indicators

### Applying events

**`applyChatRealtimeEvent`** (`features/chat/realtime/applyRealtimeEvent.ts`) updates **`@tanstack/react-query`** cache and invalidates conversation lists. `thread.updated` inbox events patch cached `ChatPreview` rows immediately so the site header Messages badge can update without waiting for a reload. **`ChatRealtimeProvider`** separately stores typing/read receipt events for UI hooks. Read receipt snapshots use normal stale React Query reads without an interval, and typing snapshot fallback is development-only when realtime is not configured; production live state is delivered through Ably.

The API publishes latency-sensitive chat realtime events directly after persistence for low latency and worker independence, including message edits and reactions on the active thread channel. Worker jobs remain fallback/asynchronous delivery for publish failures, large inbox fanout, and delete/update recovery. Do not replace this with production polling; polling typing/read state does not scale to 1M DAU.

Implement **`ChatRealtimeTransport`**:

```ts
{
  connect(): void;
  disconnect(): void;
  subscribe(handler: (e: ChatRealtimeEvent) => void): () => void;
}
```

The cache updater writes **`PaginatedMessages`** for **`chatQueryKeys.messages(chatId)`** and also maintains the first loaded page for **`chatQueryKeys.messagesInfinite(chatId)`**.

---

## 11. Performance and scale checklist

1. **Add `GET /v1/chat/conversations/{id}`** (single row) so the frontend can drop **`useConversationRow`**’s three parallel list queries when opening a thread.
2. **Cursor-based** lists only; avoid unbounded “all messages” responses.
3. **Rate limits:** return **`429`** with **`Retry-After`**; client treats as retryable.
4. **CDN** for media; **presigned uploads** instead of huge JSON `imageDataUrl`.
5. **WebSocket** per user or per shard, not one channel for all users.
6. **Index** queries by `(user_id, folder, updated_at)` and messages by `(conversation_id, created_at)`.

---

## 12. Deviating from the default paths

Prefer **one** of:

- **Reverse proxy** maps public URLs to the contract above, or
- **Fork** `features/chat/api/remoteChatClient.ts` only, keeping **`ChatApiClient`** unchanged so hooks stay stable.

---

## Related files (quick reference)

| Area | Path |
|------|------|
| Contract | `features/chat/api/ChatApiClient.ts` |
| HTTP impl | `features/chat/api/remoteChatClient.ts`, `http.ts` |
| Pagination types | `features/chat/api/types.ts` |
| Domain types | `features/chat/types.ts` |
| Env / limits | `features/chat/config/runtimeConfig.ts` |
| Hooks | `features/chat/hooks/useChatQueries.ts` |
| Query keys | `features/chat/lib/queryKeys.ts` |
| Realtime | `features/chat/realtime/*` |

For **how the UI is structured** and **day-to-day maintenance**, see **`FRONTEND_OVERVIEW_AND_MAINTENANCE.md`** in this folder.
