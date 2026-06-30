/**
 * Bridges the in-memory mock store to ChatApiClient (pagination returns one page).
 */

import type { ChatSendPayload } from "../types";
import { CHAT_PAGE_LIMITS } from "../config/runtimeConfig";
import type { ChatApiClient } from "./ChatApiClient";
import type {
  ChatFolder,
  CreateThreadParams,
  ListConversationsParams,
  ListMessagesParams,
  PaginatedConversations,
  PaginatedMessages,
} from "./types";
import {
  mockFetchConversations,
  mockFetchMessages,
  mockSendMessage,
  mockMarkConversationRead,
  mockSetConversationArchived,
  mockToggleReaction,
  mockDeleteMessage,
  mockEditMessage,
  mockDeleteConversation,
  mockCreateThread,
} from "../mock/chatStore";

function filterByFolder(list: Awaited<ReturnType<typeof mockFetchConversations>>, folder: ChatFolder) {
  return list.filter(function (c) {
    if (folder === "archived") {
      return Boolean(c.archived);
    }
    if (folder === "requests") {
      return Boolean(c.isPendingRequest) && !c.archived;
    }
    return !c.archived && !c.isPendingRequest;
  });
}

export function createMockChatClient(): ChatApiClient {
  return {
    listConversations: async function (params: ListConversationsParams) {
      const all = await mockFetchConversations();
      const filtered = filterByFolder(all, params.folder);
      const limit = params.limit ?? CHAT_PAGE_LIMITS.conversations;
      const slice = filtered.slice(0, limit);
      return {
        items: slice,
        nextCursor: null,
        hasMore: false,
      };
    },

    createThread: async function (params: CreateThreadParams) {
      return mockCreateThread({
        memberIds: params.memberIds,
        member: params.member,
      });
    },

    listMessages: async function (params: ListMessagesParams) {
      const all = await mockFetchMessages(params.chatId);
      const limit = params.limit ?? CHAT_PAGE_LIMITS.messagesInitial;
      if (all.length === 0) {
        return { items: [], nextCursor: null, hasMore: false };
      }
      if (params.direction === "after" && params.cursor) {
        const idx = all.findIndex(function (m) {
          return m.id === params.cursor;
        });
        if (idx === -1) {
          return { items: [], nextCursor: null, hasMore: false };
        }
        const slice = all.slice(idx + 1, idx + 1 + limit);
        return {
          items: slice,
          nextCursor: slice.length ? slice[slice.length - 1].id : null,
          hasMore: idx + 1 + slice.length < all.length,
        };
      }
      if (!params.cursor) {
        const slice = all.slice(Math.max(0, all.length - limit));
        return {
          items: slice,
          nextCursor: slice.length > 0 ? slice[0].id : null,
          hasMore: slice.length > 0 && all[0].id !== slice[0].id,
        };
      }
      const idx = all.findIndex(function (m) {
        return m.id === params.cursor;
      });
      if (idx <= 0) {
        return { items: [], nextCursor: null, hasMore: false };
      }
      const start = Math.max(0, idx - limit);
      const slice = all.slice(start, idx);
      return {
        items: slice,
        nextCursor: slice.length > 0 ? slice[0].id : null,
        hasMore: start > 0,
      };
    },

    sendMessage: async function (chatId: string, payload: ChatSendPayload) {
      const message = await mockSendMessage(chatId, payload);
      return { message: message };
    },

    toggleReaction: function (chatId, messageId, emoji) {
      return mockToggleReaction(chatId, messageId, emoji);
    },

    editMessage: function (chatId, messageId, body) {
      return mockEditMessage(chatId, messageId, body);
    },

    deleteMessage: function (chatId, messageId) {
      return mockDeleteMessage(chatId, messageId);
    },

    markConversationRead: function (chatId) {
      return mockMarkConversationRead(chatId);
    },

    setConversationArchived: function (chatId, archived) {
      return mockSetConversationArchived(chatId, archived);
    },

    deleteConversation: function (chatId) {
      return mockDeleteConversation(chatId);
    },
  };
}
