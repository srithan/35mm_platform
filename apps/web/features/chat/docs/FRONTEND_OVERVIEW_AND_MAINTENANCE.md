# Chat: Frontend overview and maintenance

This document is for **frontend engineers** and **maintainers** of the 35mm chat experience. It explains what the feature is, how it is structured, how data flows, and how to change it safely.

---

## Table of contents

1. [What this feature is](#1-what-this-feature-is)
2. [High-level architecture](#2-high-level-architecture)
3. [Directory map](#3-directory-map)
4. [Routing and pages](#4-routing-and-pages)
5. [Data layer: API client and hooks](#5-data-layer-api-client-and-hooks)
6. [UI components](#6-ui-components)
7. [State: local vs server](#7-state-local-vs-server)
8. [Theming and polish](#8-theming-and-polish)
9. [Realtime layer](#9-realtime-layer)
10. [Testing and mocks](#10-testing-and-mocks)
11. [Maintenance guide](#11-maintenance-guide)
12. [Known limitations and follow-ups](#12-known-limitations-and-follow-ups)

---

## 1. What this feature is

The chat module provides:

- **Desktop:** split view — conversation list + active thread (`ChatContent`), or full thread on `/chat/[chatId]`.
- **Mobile:** list + tabs (**All / Requests / Archived**) on `/chat`, and thread view with **`ChatMobileHeader`** + **`ChatConversation`** on `/chat/[chatId]`.
- **Behaviors:** send text, replies, reactions, GIFs (Tenor), lightweight file/image payloads in mock, archive/unarchive, delete message (own), delete conversation, in-thread search, jump-to-quoted message, read receipts (mock), message-request row (**`isPendingRequest`**).

**Default data source:** in-memory **mock** (`features/chat/mock/chatStore.ts`) with seeded threads (`seedChatThreads.ts`). **Production path:** swap to **remote** API via env (see **`BACKEND_INTEGRATION.md`**).

---

## 2. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  app/providers.tsx                                          │
│  QueryClient (chat-tuned defaults) + ChatRealtimeProvider   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  getChatApiClient() → ChatApiClient (mock | remote HTTP)      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  useChatQueries hooks (TanStack Query)                       │
│  • list by folder • messages • mutations • infinite (ready)   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Presentational components (ChatList, ChatConversation, …)   │
└─────────────────────────────────────────────────────────────┘
```

**Principle:** UI components **do not** import the mock store directly. They use **hooks** that call **`getChatApiClient()`**, so the same UI works against mock or HTTP.

**Exception:** **`getChatById`** in **`ChatContent`** / Next.js **`generateMetadata`** still reads **`features/chat/data/mockChats.ts`** for static metadata when the server renders `/chat/[chatId]`. When the backend exists, replace with a server fetch or shared cache.

---

## 3. Directory map

| Path | Role |
| ---- | ---- |
| `features/chat/api/` | **`ChatApiClient`** contract, mock/remote implementations, HTTP helper, errors, singleton + auth token setter |
| `features/chat/config/` | **`runtimeConfig.ts`** — env mode, base URL, page limits, React Query policy |
| `features/chat/data/` | **`mockChats.ts`** — seed **ChatPreview** metadata for SSR/static lookup |
| `features/chat/mock/` | **`chatStore.ts`** — in-memory conversations + messages; **`seedChatThreads.ts`** |
| `features/chat/hooks/` | **`useChatQueries.ts`**, **`chatQueryDefaults.ts`** |
| `features/chat/lib/` | **`queryKeys.ts`**, **`formatChatTime.ts`** |
| `features/chat/realtime/` | Transport interface, noop impl, **`applyChatRealtimeEvent`**, provider |
| `features/chat/context/` | **`ChatSidebarContext`** — shared desktop rail collapse |
| `features/chat/components/` | All React UI for chat |
| `features/chat/types.ts` | Shared **ChatPreview**, **ChatMessage**, **ChatSendPayload**, etc. |
| `features/chat/index.ts` | Public re-exports for app-level wiring |
| `features/chat/docs/` | This file + backend integration guide |

---

## 4. Routing and pages

| Route | What renders |
| ----- | -------------- |
| `app/providers.tsx` | **`ChatSidebarProvider`** (inside **`ChatRealtimeProvider`**) — desktop list **collapsed** state and **`sessionStorage`** persist across `/chat` ↔ `/chat/[id]` and app-wide. |
| `app/(shell)/chat/page.tsx` | Desktop: **`ChatContent`** (no `selectedId`). Mobile: **`ChatPageMobile`**. |
| `app/(shell)/chat/[chatId]/page.tsx` | Server: **`getChatById`** → **`notFound`** if missing. Client: **`ChatDetailPage`**. |

**`ChatDetailPage`:**

- Desktop: **`ChatContent selectedId={chat.id}`** (list + thread).
- Mobile: **`ChatMobileHeader`** + **`ChatConversation`** (header hidden on thread body).

**Navigation helpers:** `ROUTES.CHAT`, `ROUTES.CHAT_WITH(id)` (`lib/constants/routes`).

---

## 5. Data layer: API client and hooks

### 5.1 Client resolution

- **`getChatApiClient()`** (`api/getChatApiClient.ts`) returns a **singleton**.
- **`setChatAuthGetToken`** registers Bearer token resolution for remote mode.
- Tests: **`__resetChatApiClientForTests`**, **`__setChatApiClientForTests`**.

### 5.2 Hooks (`hooks/useChatQueries.ts`)

| Hook | Purpose |
| ---- | ------- |
| **`useConversations({ folder })`** | One folder: `inbox` \| `archived` \| `requests`. Returns **items** via `select`. |
| **`useConversationsByUiFilter(filter)`** | Maps UI `active` \| `archived` \| `requests` → folder. |
| **`useConversationRow(chatId)`** | Finds one **ChatPreview** across three folder queries (temporary; expensive). |
| **`useChatMessages(chatId)`** | Initial message window (`direction: before`, no cursor). |
| **`useChatMessagesInfinite(chatId)`** | Infinite query for older pages (UI can adopt later). |
| **`useSendMessage`** | Idempotency key on send; invalidates messages + all conversation folders. |
| **`useToggleReaction`**, **`useDeleteMessage`** | Message-level mutations. |
| **`useMarkConversationRead`** | Clears unread (mock); invalidates lists. |
| **`useSetConversationArchived`** | Archive/unarchive. |
| **`useDeleteConversation`** | Removes thread + cache; used by confirm dialogs. |
| **`useRespondToConversationRequest`** | Calls optional API method if present. |

### 5.3 Query keys (`lib/queryKeys.ts`)

Use **`chatQueryKeys`** for any manual **`invalidateQueries`** / **`setQueryData`** so keys stay consistent:

- `conversations(folder)`
- `messages(chatId)`
- `messagesInfinite(chatId)`
- `conversation(chatId)` — reserved for future single-row fetch

### 5.4 Global Query defaults (`hooks/chatQueryDefaults.ts`)

Applied in **`app/providers.tsx`** via **`chatQueryClientDefaults()`**: stale times, gc times, retry with **`isRetryableChatError`**.

---

## 6. UI components

| Component | Responsibility |
| --------- | -------------- |
| **`ChatContent`** | Grid: **`ChatList`** + **`ChatConversation`**. Derives names from **`getChatById(selectedId)`**. |
| **`ChatList`** | Folders (desktop), search, collapse, links to **`ROUTES.CHAT_WITH(id)`**. Data from **`useConversationsByUiFilter`**. |
| **`ChatPageMobile`** | Top search, tabs, embeds **`ChatList`** with `showHeader={false}` and `conversationFilter` from tab. |
| **`ChatConversation`** | Thread header (desktop), scroll region, **`ChatMessageList`**, **`ChatComposer`**, mutations, delete/archive dialogs. |
| **`ChatMessageList`** | Bubbles, reactions toolbar, more menu (portaled), day separators, jump highlight. |
| **`ChatComposer`** | Textarea, attachments, Tenor, emoji panel, reply strip. |
| **`ChatHeaderMoreMenu`** | Thread-level menu (portaled, fixed position). |
| **`ChatMobileHeader`** | Back, profile link, search-in-thread, menu, delete confirm. |
| **`ChatDetailPage`** | Composes desktop **`ChatContent`** + mobile shell. |
| **`ChatSearchInput`** | Shared styled search field (`select-text` where parent is `select-none`). |

---

## 7. State: local vs server

**Server (React Query):** conversation lists per folder, message list per `chatId`, mutation side effects.

**Local (React `useState`):**

- List folder (desktop) when not controlled by parent.
- Composer focus, reply target, thread search open/query, header toasts, dialog open flags.
- **`ChatContent`:** reads sidebar collapse from **`useChatSidebar()`** (provider in **`app/providers.tsx`**).

**URL:** `chatId` from route drives **`selectedId`** on desktop detail layout.

---

## 8. Theming and polish

- Uses app tokens: **`bg-bg`**, **`text-fg`**, **`border-border`**, **`bg-elevated`**, **`bg-sunken`**, **`bg-hover`**, iMessage blue **`#007AFF`** / **`#0A84FF`** for sent bubbles.
- **`select-none`** on list chrome and headers; inputs use **`select-text`**.
- Menus: prefer **solid `bg-elevated`** (avoid heavy backdrop blur on small dropdowns).

---

## 9. Realtime layer

- **`ChatRealtimeProvider`** wraps the app (inside **`QueryClientProvider`**).
- Default transport is **noop**; subscribe does nothing.
- When you add Pusher/Ably/WS, pass **`transport`** and emit **`ChatRealtimeEvent`** shapes — **`applyChatRealtimeEvent`** updates caches.

**Dev-only:** **`useChatRealtime().emitDevEvent`** (if exposed in dev) can simulate events.

---

## 10. Testing and mocks

- **Unit tests** for hooks: use **`__setChatApiClientForTests`** with a fake **`ChatApiClient`**, or **`QueryClientProvider`** + MSW.
- **E2E:** mock network or run against **`CHAT_API_MODE=mock`** (no backend).

---

## 11. Maintenance guide

### 11.1 Adding a new API operation

1. Add method to **`ChatApiClient`** (`api/ChatApiClient.ts`).
2. Implement in **`mockChatClient.ts`** and **`remoteChatClient.ts`**.
3. Add **`useMutation` / `useQuery`** in **`useChatQueries.ts`** with correct **`chatQueryKeys`** invalidation.
4. Wire UI and update **`BACKEND_INTEGRATION.md`** if the contract changes.

### 11.2 Changing pagination defaults

Edit **`CHAT_PAGE_LIMITS`** and **`CHAT_QUERY_POLICY`** in **`config/runtimeConfig.ts`**. Avoid hardcoding limits in components.

### 11.3 Adding a new folder or tab

1. Extend **`ChatFolder`** and **`folderFromUiFilter`** if needed.
2. Update **`mockChatClient`** `filterByFolder` logic.
3. Update **`ChatList`** / **`ChatPageMobile`** props and empty-state copy.
4. Document backend **`folder=`** enum in **`BACKEND_INTEGRATION.md`**.

### 11.4 Changing REST paths (remote only)

Prefer editing **`remoteChatClient.ts`** only. Keep **`ChatApiClient`** stable.

### 11.5 SSR / metadata

`app/(shell)/chat/[chatId]/page.tsx` uses **`getChatById`**. For production, fetch conversation title from API in **`generateMetadata`** or accept a generic title until hydrated.

### 11.6 Lint and typecheck

```bash
npx tsc --noEmit
```

Run project ESLint on touched files before merge.

### 11.7 Dependencies

- **@tanstack/react-query** — required.
- **Tenor** — `NEXT_PUBLIC_TENOR_API_KEY` for GIF picker (`ChatComposer` / **`TenorGifPicker`**).

---

## 12. Known limitations and follow-ups

1. **`useConversationRow`** issues **three** list queries per open thread — replace with **`GET /conversations/:id`** when backend exists.
2. **Realtime cache:** align **`applyChatRealtimeEvent`** with the **actual** cached shape for **`chatQueryKeys.messages`** (pagination vs `ChatMessage[]`) before relying on WS in production.
3. **`useChatMessagesInfinite`** is ready but **not** wired in **`ChatMessageList`** — add “load older” when UX requires it.
4. **Uploads:** mock uses data URLs / metadata; production should use **presigned uploads** and attachment ids in **`ChatSendPayload`**.
5. **`getChatById`** for **`ChatContent`** is static — can desync from API archive/request flags until server-driven preview is used.
6. **`respondToConversationRequest`** — UI button not required yet; hook exists for API readiness.

---

## Related documentation

- **`BACKEND_INTEGRATION.md`** — REST contract, auth, pagination, errors, realtime, scale checklist.
