"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import type { ChatPreview } from "../types";
import { useConversations } from "./useChatQueries";

function sumUnread(items: ChatPreview[] | undefined): number {
  if (!items) {
    return 0;
  }
  return items.reduce(function (total, item) {
    var unread = item.unread ?? 0;
    return total + (Number.isFinite(unread) && unread > 0 ? unread : 0);
  }, 0);
}

export function formatChatUnreadBadgeCount(count: number): string {
  if (count > 99) {
    return "99+";
  }
  return String(count);
}

export function useChatUnreadBadgeCount(): number {
  const { isLoaded, isSignedIn } = useAuth();
  const enabled = isLoaded && Boolean(isSignedIn);
  const inboxQuery = useConversations({ folder: "inbox", enabled: enabled });
  const requestsQuery = useConversations({
    folder: "requests",
    enabled: enabled,
  });

  return useMemo(
    function () {
      if (!enabled) {
        return 0;
      }
      return sumUnread(inboxQuery.data) + sumUnread(requestsQuery.data);
    },
    [enabled, inboxQuery.data, requestsQuery.data]
  );
}
