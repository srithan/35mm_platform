"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchNotifications } from "@/features/notifications/api/notificationsApi";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";

function stripUnreadPrefix(title: string): string {
  return title.replace(/^(\(\d+\+?\)\s+)+/, "");
}

export function NotificationTitleBadge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const unreadQuery = useQuery({
    queryKey: notificationsKeys.unread(),
    queryFn: async function () {
      return fetchNotifications({
        token: await getToken(),
        unreadOnly: true,
        limit: 50,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
  });

  const unreadCount = unreadQuery.data?.items.length ?? 0;
  const hasMore = Boolean(unreadQuery.data?.hasMore);

  useEffect(
    function () {
      const baseTitle = stripUnreadPrefix(document.title || "35mm");
      if (!isLoaded || !isSignedIn || unreadCount <= 0) {
        document.title = baseTitle;
        return;
      }

      const displayCount = hasMore ? `${unreadCount}+` : String(unreadCount);
      document.title = `(${displayCount}) ${baseTitle}`;
    },
    [hasMore, isLoaded, isSignedIn, unreadCount]
  );

  return null;
}
