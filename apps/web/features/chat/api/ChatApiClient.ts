/**
 * Single facade for all chat server operations. Mock and HTTP implementations
 * both satisfy this contract so hooks stay identical when backend ships.
 */

import type { ChatMessage, ChatPreview, ChatSendPayload } from "../types";
import type {
  ChatReadReceiptsResponse,
  ChatTypingSnapshot,
} from "@35mm/types";
import type {
  ChatFolder,
  CreateThreadParams,
  ListConversationsParams,
  ListMessagesParams,
  PaginatedConversations,
  PaginatedMessages,
  SendMessageResult,
} from "./types";

export interface ChatApiClient {
  listConversations(
    params: ListConversationsParams
  ): Promise<PaginatedConversations>;

  listMessages(params: ListMessagesParams): Promise<PaginatedMessages>;

  createThread(params: CreateThreadParams): Promise<ChatPreview>;

  sendMessage(
    chatId: string,
    payload: ChatSendPayload,
    opts?: { idempotencyKey?: string }
  ): Promise<SendMessageResult>;

  toggleReaction(
    chatId: string,
    messageId: string,
    emoji: string,
    shouldRemove?: boolean
  ): Promise<void>;

  editMessage(chatId: string, messageId: string, body: string): Promise<ChatMessage>;

  deleteMessage(chatId: string, messageId: string): Promise<void>;

  markConversationRead(chatId: string, lastReadMessageId: string): Promise<void>;

  listReadReceipts(chatId: string): Promise<ChatReadReceiptsResponse>;

  setTyping(chatId: string, isTyping: boolean): Promise<void>;

  listTypingUsers(chatId: string): Promise<ChatTypingSnapshot>;

  setConversationArchived(chatId: string, archived: boolean): Promise<void>;

  deleteConversation(chatId: string): Promise<void>;

  /**
   * Accept or decline a pending request (when folder=requests).
   * Optional until your product has message requests; mock can no-op or stub.
   */
  respondToConversationRequest?(
    chatId: string,
    action: "accept" | "decline"
  ): Promise<void>;
}

export function folderFromUiFilter(
  filter: "active" | "archived" | "requests"
): ChatFolder {
  if (filter === "archived") {
    return "archived";
  }
  if (filter === "requests") {
    return "requests";
  }
  return "inbox";
}
