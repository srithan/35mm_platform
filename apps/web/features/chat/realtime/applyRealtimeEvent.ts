"use client";

/**
 * Maps incoming realtime payloads to cache updates — call from transport handler.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { ChatRealtimeEvent } from "./types";
import { chatQueryKeys } from "../lib/queryKeys";
import type { ChatMessage } from "../types";
import { upsertChatMessageSorted } from "../lib/sortChatMessages";
import type { PaginatedMessages } from "../api/types";

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
    queryClient.invalidateQueries({
      queryKey: chatQueryKeys.conversations("inbox"),
    });
    queryClient.invalidateQueries({
      queryKey: chatQueryKeys.conversations("archived"),
    });
    queryClient.invalidateQueries({
      queryKey: chatQueryKeys.conversations("requests"),
    });
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
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.root });
    return;
  }
  if (event.type === "conversation.invalidated") {
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.root });
    return;
  }
  if (event.type === "conversation.deleted") {
    queryClient.removeQueries({
      queryKey: chatQueryKeys.messages(event.chatId),
    });
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.root });
  }
}
