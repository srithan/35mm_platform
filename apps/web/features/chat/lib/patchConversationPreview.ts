"use client";

import type { InfiniteData } from "@tanstack/react-query";
import type { PaginatedConversations } from "../api/types";
import type { ChatPreview } from "../types";

export interface ConversationPreviewPatch {
  chatId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
}

export function patchConversationPreviewInPages(
  prev: InfiniteData<PaginatedConversations> | undefined,
  patch: ConversationPreviewPatch
): { data: InfiniteData<PaginatedConversations> | undefined; patched: boolean } {
  if (!prev || prev.pages.length === 0) {
    return { data: prev, patched: false };
  }

  let patchedItem: ChatPreview | null = null;
  const pages = prev.pages.map(function (page) {
    const items = page.items.filter(function (item) {
      if (item.id !== patch.chatId) {
        return true;
      }
      patchedItem = {
        ...item,
        lastMessage: patch.lastMessage ?? item.lastMessage,
        lastMessageAt: patch.lastMessageAt ?? item.lastMessageAt,
        unread: patch.unread ?? item.unread,
      };
      return false;
    });
    return { ...page, items };
  });

  if (!patchedItem) {
    return { data: prev, patched: false };
  }

  pages[0] = {
    ...pages[0],
    items: [patchedItem, ...pages[0].items],
  };

  return {
    data: {
      ...prev,
      pages,
    },
    patched: true,
  };
}
