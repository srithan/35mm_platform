/**
 * API boundary types (pagination, folders). Domain entities stay in ../types.
 */

import type { ChatMessage, ChatPreview, ChatSendPayload } from "../types";

export type ChatFolder = "inbox" | "archived" | "requests";

export interface ListConversationsParams {
  folder: ChatFolder;
  cursor?: string | null;
  limit?: number;
}

export interface PaginatedConversations {
  items: ChatPreview[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type MessagePageDirection = "before" | "after";

export interface ListMessagesParams {
  chatId: string;
  cursor?: string | null;
  limit?: number;
  /** Load older messages (scroll up) vs newer (gap fill / realtime catch-up). */
  direction?: MessagePageDirection;
}

export interface PaginatedMessages {
  items: ChatMessage[];
  /** Cursor for the next page in the same direction. */
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SendMessageResult {
  message: ChatMessage;
}

export interface CreateThreadParams {
  type: "dm";
  memberIds: string[];
  /** Used by the mock client to build a preview when profiles are not loaded. */
  member?: {
    username: string;
    displayName: string;
  };
}
