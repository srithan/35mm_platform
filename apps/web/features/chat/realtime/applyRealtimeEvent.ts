"use client";

/**
 * Maps incoming realtime payloads to cache updates — call from transport handler.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ChatRealtimeEvent } from "./types";
import { chatQueryKeys } from "../lib/queryKeys";
import type { ChatMessage, ChatPreview } from "../types";
import { upsertChatMessageSorted } from "../lib/sortChatMessages";
import type { ChatFolder, PaginatedConversations, PaginatedMessages } from "../api/types";
import { formatRelativeShort } from "../lib/formatChatTime";

function emptyMessagesPage(): PaginatedMessages {
  return { items: [], nextCursor: null, hasMore: false };
}

function patchMessagesPage(
  prev: PaginatedMessages | undefined,
  patchItems: (items: ChatMessage[]) => ChatMessage[]
): PaginatedMessages {
  var base = prev ?? emptyMessagesPage();
  return {
    ...base,
    items: patchItems(base.items),
  };
}

function patchNewestInfinitePage(
  prev: InfiniteData<PaginatedMessages> | undefined,
  patchItems: (items: ChatMessage[]) => ChatMessage[]
): InfiniteData<PaginatedMessages> | undefined {
  if (!prev || prev.pages.length === 0) {
    return prev;
  }
  return {
    ...prev,
    pages: prev.pages.map(function (page, index) {
      if (index !== 0) {
        return page;
      }
      return patchMessagesPage(page, patchItems);
    }),
  };
}

function patchAllInfinitePages(
  prev: InfiniteData<PaginatedMessages> | undefined,
  patchItems: (items: ChatMessage[]) => ChatMessage[]
): InfiniteData<PaginatedMessages> | undefined {
  if (!prev || prev.pages.length === 0) {
    return prev;
  }
  return {
    ...prev,
    pages: prev.pages.map(function (page) {
      return patchMessagesPage(page, patchItems);
    }),
  };
}

function patchConversationList(
  prev: InfiniteData<PaginatedConversations> | undefined,
  patchItem: (item: ChatPreview) => ChatPreview
): InfiniteData<PaginatedConversations> | undefined {
  if (!prev) {
    return prev;
  }
  return {
    ...prev,
    pages: prev.pages.map(function (page) {
      return {
        ...page,
        items: page.items.map(patchItem),
      };
    }),
  };
}

function invalidateConversationLists(queryClient: QueryClient): void {
  (["inbox", "archived", "requests"] as ChatFolder[]).forEach(function (folder) {
    queryClient.invalidateQueries({
      queryKey: chatQueryKeys.conversations(folder),
    });
  });
}

export function applyChatRealtimeEvent(
  queryClient: QueryClient,
  event: ChatRealtimeEvent
): void {
  if (event.type === "message.created" || event.type === "message.updated") {
    queryClient.setQueryData<PaginatedMessages>(
      chatQueryKeys.messages(event.chatId),
      function (prev) {
        return patchMessagesPage(prev, function (items) {
          return upsertChatMessageSorted(items, event.message);
        });
      }
    );
    queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
      chatQueryKeys.messagesInfinite(event.chatId),
      function (prev) {
        return patchNewestInfinitePage(prev, function (items) {
          return upsertChatMessageSorted(items, event.message);
        });
      }
    );
    invalidateConversationLists(queryClient);
    return;
  }
  if (event.type === "message.deleted") {
    queryClient.setQueryData<PaginatedMessages>(
      chatQueryKeys.messages(event.chatId),
      function (prev) {
        if (!prev) {
          return prev;
        }
        return patchMessagesPage(prev, function (items) {
          return items.filter(function (m) {
            return m.id !== event.messageId;
          });
        });
      }
    );
    queryClient.setQueryData<InfiniteData<PaginatedMessages>>(
      chatQueryKeys.messagesInfinite(event.chatId),
      function (prev) {
        return patchAllInfinitePages(prev, function (items) {
          return items.filter(function (m) {
            return m.id !== event.messageId;
          });
        });
      }
    );
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.root });
    return;
  }
  if (event.type === "conversation.updated") {
    invalidateConversationLists(queryClient);
    return;
  }
  if (event.type === "conversation.invalidated") {
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.root });
    return;
  }
  if (event.type === "conversation.patch") {
    let patched = false;
    (["inbox", "archived", "requests"] as ChatFolder[]).forEach(function (folder) {
      queryClient.setQueryData<InfiniteData<PaginatedConversations>>(
        chatQueryKeys.conversations(folder),
        function (prev) {
          return patchConversationList(prev, function (item) {
            if (item.id !== event.chatId) {
              return item;
            }
            patched = true;
            return {
              ...item,
              lastMessage: event.lastMessage ?? item.lastMessage,
              lastMessageAt: event.lastMessageAt
                ? formatRelativeShort(new Date(event.lastMessageAt))
                : item.lastMessageAt,
              unread: event.unread ?? item.unread,
            };
          });
        }
      );
    });
    invalidateConversationLists(queryClient);
    if (!patched) {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.root });
    }
    return;
  }
  if (event.type === "conversation.deleted") {
    queryClient.removeQueries({
      queryKey: chatQueryKeys.messages(event.chatId),
    });
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.root });
  }
}
