/**
 * Chat frontend runtime — tuned for production React Query + API usage.
 * Backend switches via NEXT_PUBLIC_CHAT_API_MODE / NEXT_PUBLIC_CHAT_API_URL.
 */

export type ChatApiMode = "mock" | "remote";

export const CHAT_API_MODE: ChatApiMode =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_CHAT_API_MODE === "remote"
    ? "remote"
    : "mock";

/** Base URL without trailing slash, e.g. https://api.35mm.in */
export const CHAT_API_BASE_URL: string =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_CHAT_API_URL?.replace(/\/$/, "")) ||
  "";

export const CHAT_PAGE_LIMITS = {
  /** Conversation list page size (cursor pagination). */
  conversations: 40,
  /** Message history page when loading older (infinite scroll up). */
  messagesOlder: 50,
  /** Optional: initial window when opening a thread. */
  messagesInitial: 80,
} as const;

export const CHAT_QUERY_POLICY = {
  /** Conversations list: balance freshness vs load at ~1M MAU. */
  staleTimeMs: 30_000,
  gcTimeMs: 1_800_000,
  /** Thread messages: slightly shorter stale window while viewing. */
  messagesStaleTimeMs: 20_000,
  messagesGcTimeMs: 900_000,
  maxRetries: 2,
  /** Exponential backoff cap for react-query retryDelay */
  retryDelayMaxMs: 30_000,
} as const;

export const CHAT_HTTP = {
  timeoutMs: 25_000,
  /** Prefix for all REST routes (adjust to match your gateway). */
  restPrefix: "/v1/chat",
} as const;
