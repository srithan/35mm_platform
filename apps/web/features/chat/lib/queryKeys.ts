/**
 * Hierarchical TanStack Query keys for chat — enables targeted invalidation
 * when WebSocket events arrive (invalidate one thread vs full list).
 */

import type { ChatFolder } from "../api/types";

export const chatQueryRoot = ["35mm", "chat"] as const;

export const chatQueryKeys = {
  root: chatQueryRoot,

  conversations: function (folder: ChatFolder) {
    return [...chatQueryRoot, "conversations", { folder: folder }] as const;
  },

  conversation: function (chatId: string) {
    return [...chatQueryRoot, "conversation", chatId] as const;
  },

  messages: function (chatId: string) {
    return [...chatQueryRoot, "messages", chatId] as const;
  },

  messagesInfinite: function (chatId: string) {
    return [...chatQueryRoot, "messagesInfinite", chatId] as const;
  },

  presence: function (userIds: string[]) {
    return [...chatQueryRoot, "presence", userIds.slice().sort().join(",")] as const;
  },
} as const;
