/**
 * Resolves the active ChatApiClient. Swap implementation via env only.
 */

import {
  CHAT_API_BASE_URL,
  CHAT_API_MODE,
} from "../config/runtimeConfig";
import type { ChatApiClient } from "./ChatApiClient";
import { createMockChatClient } from "./mockChatClient";
import { createRemoteChatClient } from "./remoteChatClient";
import { ChatApiError } from "./errors";

let singleton: ChatApiClient | null = null;

/**
 * Optional: wire to your auth layer (Clerk, Auth0, session cookie, etc.).
 * Return null for unauthenticated — hooks should disable queries when no session.
 */
export type ChatAuthGetToken = () => string | null | Promise<string | null>;

let authResolver: ChatAuthGetToken | null = null;

export function setChatAuthGetToken(fn: ChatAuthGetToken | null): void {
  authResolver = fn;
}

export function getChatApiClient(): ChatApiClient {
  if (singleton) {
    return singleton;
  }
  if (CHAT_API_MODE === "remote") {
    if (!CHAT_API_BASE_URL) {
      throw new ChatApiError(
        "NEXT_PUBLIC_CHAT_API_URL is required when NEXT_PUBLIC_CHAT_API_MODE=remote",
        { code: "config", status: 0 }
      );
    }
    singleton = createRemoteChatClient({
      baseUrl: CHAT_API_BASE_URL,
      getAccessToken: function () {
        return authResolver ? authResolver() : null;
      },
    });
  } else {
    singleton = createMockChatClient();
  }
  return singleton;
}

/** Tests only — reset singleton between cases. */
export function __resetChatApiClientForTests(): void {
  singleton = null;
}

/** Tests only — inject a custom client. */
export function __setChatApiClientForTests(client: ChatApiClient): void {
  singleton = client;
}
