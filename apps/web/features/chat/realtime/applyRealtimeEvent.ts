"use client";

/**
 * Maps incoming realtime payloads to cache updates — call from transport handler.
 */

import type { QueryClient } from "@tanstack/react-query";
import type { ChatRealtimeEvent } from "./types";
import { chatQueryKeys } from "../lib/queryKeys";
import type { ChatMessage } from "../types";

function upsertMessageSorted(list: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  const idx = list.findIndex(function (m) {
    return m.id === msg.id;
  });
  if (idx !== -1) {
    const next = list.slice();
    next[idx] = msg;
    return next;
  }
  const next = list.concat([msg]);
  next.sort(function (a, b) {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  return next;
}

export function applyChatRealtimeEvent(
  queryClient: QueryClient,
  event: ChatRealtimeEvent
): void {
  if (event.type === "message.created" || event.type === "message.updated") {
    queryClient.setQueryData<ChatMessage[]>(
      chatQueryKeys.messages(event.chatId),
      function (prev) {
        const base = prev ?? [];
        return upsertMessageSorted(base, event.message);
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
    queryClient.setQueryData<ChatMessage[]>(
      chatQueryKeys.messages(event.chatId),
      function (prev) {
        if (!prev) {
          return prev;
        }
        return prev.filter(function (m) {
          return m.id !== event.messageId;
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
  if (event.type === "conversation.deleted") {
    queryClient.removeQueries({
      queryKey: chatQueryKeys.messages(event.chatId),
    });
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.root });
  }
}
