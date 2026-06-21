import type { WheelEvent } from "react";
import { useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/features/notifications/api/notificationsApi";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import type { NotificationPage } from "@35mm/types";
import type { HeaderNotifRow } from "../types";

export function useSiteHeaderNotifications() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const notifRowsQuery = useQuery({
    queryKey: notificationsKeys.preview(),
    queryFn: async function () {
      return fetchNotifications({
        token: await getToken(),
        limit: 10,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 20_000,
    refetchInterval: 5_000,
    gcTime: 5 * 60_000,
  });
  const notifRows = (notifRowsQuery.data?.items ?? []) as HeaderNotifRow[];

  const unreadRowsQuery = useQuery({
    queryKey: notificationsKeys.unread(),
    queryFn: async function () {
      return fetchNotifications({
        token: await getToken(),
        unreadOnly: true,
        limit: 50,
      });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 20_000,
    refetchInterval: 5_000,
    gcTime: 5 * 60_000,
  });
  const unreadRows = unreadRowsQuery.data?.items ?? [];

  const unreadBadgeCount =
    unreadRowsQuery.data?.hasMore && unreadRowsQuery.data?.items.length
      ? `${unreadRowsQuery.data.items.length}+`
      : String(unreadRows.length);

  const markAllMutation = useMutation({
    mutationFn: async function () {
      return markAllNotificationsRead({
        token: await getToken(),
      });
    },
    onMutate: async function () {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKeys.preview() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.unread() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.content() }),
      ]);

      const previousContent = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      const previousPreview = queryClient.getQueryData(notificationsKeys.preview()) as
        | { items: { id: string; isRead: boolean }[]; itemsLeft?: number; hasMore?: boolean }
        | undefined;
      const previousUnread = queryClient.getQueryData(notificationsKeys.unread()) as
        | { items: { id: string; isRead: boolean }[]; hasMore?: boolean }
        | undefined;

      if (previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), {
          ...previousContent,
          items: previousContent.items.map(function (item) {
            return { ...item, isRead: true };
          }),
        });
      }

      if (previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), {
          ...previousPreview,
          items: previousPreview.items.map(function (item) {
            return { ...item, isRead: true };
          }),
        });
      }

      if (previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), {
          ...previousUnread,
          items: [],
        });
      }

      return { previousContent, previousPreview, previousUnread };
    },
    onError: function (_error, _vars, context) {
      if (!context) return;
      if (context.previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), context.previousContent);
      }
      if (context.previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), context.previousPreview);
      }
      if (context.previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), context.previousUnread);
      }
    },
    onSuccess: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: async function (notificationId: string) {
      return markNotificationRead({
        token: await getToken(),
        notificationId,
      });
    },
    onMutate: async function (notificationId: string) {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKeys.preview() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.unread() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.content() }),
      ]);

      const previousContent = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      const previousPreview = queryClient.getQueryData(notificationsKeys.preview()) as
        | { items: { id: string; isRead: boolean }[]; itemsLeft?: number; hasMore?: boolean }
        | undefined;
      const previousUnread = queryClient.getQueryData(notificationsKeys.unread()) as
        | { items: { id: string; isRead: boolean }[]; hasMore?: boolean }
        | undefined;

      if (previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), {
          ...previousContent,
          items: previousContent.items.map(function (item) {
            if (item.id !== notificationId) return item;
            return { ...item, isRead: true };
          }),
        });
      }

      if (previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), {
          ...previousPreview,
          items: previousPreview.items.map(function (item) {
            if (item.id !== notificationId) return item;
            return { ...item, isRead: true };
          }),
        });
      }

      if (previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), {
          ...previousUnread,
          items: previousUnread.items.filter(function (item) {
            return item.id !== notificationId;
          }),
        });
      }

      return { previousContent, previousPreview, previousUnread };
    },
    onError: function (_error, _id, context) {
      if (!context) return;
      if (context.previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), context.previousContent);
      }
      if (context.previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), context.previousPreview);
      }
      if (context.previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), context.previousUnread);
      }
    },
    onSuccess: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: async function (notificationId: string) {
      return markNotificationUnread({
        token: await getToken(),
        notificationId,
      });
    },
    onMutate: async function (notificationId: string) {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: notificationsKeys.preview() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.unread() }),
        queryClient.cancelQueries({ queryKey: notificationsKeys.content() }),
      ]);

      const previousContent = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
      const previousPreview = queryClient.getQueryData(notificationsKeys.preview()) as
        | { items: { id: string; isRead: boolean }[]; itemsLeft?: number; hasMore?: boolean }
        | undefined;
      const previousUnread = queryClient.getQueryData(notificationsKeys.unread()) as
        | { items: { id: string; isRead: boolean }[]; hasMore?: boolean }
        | undefined;

      if (previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), {
          ...previousContent,
          items: previousContent.items.map(function (item) {
            if (item.id !== notificationId) return item;
            return { ...item, isRead: false };
          }),
        });
      }

      if (previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), {
          ...previousPreview,
          items: previousPreview.items.map(function (item) {
            if (item.id !== notificationId) return item;
            return { ...item, isRead: false };
          }),
        });
      }

      if (previousUnread) {
        const previewItem = previousPreview?.items.find(function (item) {
          return item.id === notificationId;
        });
        if (previewItem && !previousUnread.items.some(function (item) { return item.id === notificationId; })) {
          queryClient.setQueryData(notificationsKeys.unread(), {
            ...previousUnread,
            items: [{ ...previewItem, isRead: false }, ...previousUnread.items],
          });
        }
      }

      return { previousContent, previousPreview, previousUnread };
    },
    onError: function (_error, _id, context) {
      if (!context) return;
      if (context.previousContent) {
        queryClient.setQueryData(notificationsKeys.content(), context.previousContent);
      }
      if (context.previousPreview) {
        queryClient.setQueryData(notificationsKeys.preview(), context.previousPreview);
      }
      if (context.previousUnread) {
        queryClient.setQueryData(notificationsKeys.unread(), context.previousUnread);
      }
    },
    onSuccess: function () {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  const notifListRef = useRef<HTMLUListElement>(null);

  function trapNotifPanelWheel(ev: WheelEvent<HTMLDivElement>) {
    ev.stopPropagation();

    const list = notifListRef.current;
    if (!list) {
      ev.preventDefault();
      return;
    }

    const deltaY = ev.deltaY;
    if (deltaY === 0) return;

    const maxScrollTop = list.scrollHeight - list.clientHeight;
    if (maxScrollTop <= 0) {
      ev.preventDefault();
      return;
    }

    const atTop = list.scrollTop <= 0;
    const atBottom = list.scrollTop >= maxScrollTop - 1;

    if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
      ev.preventDefault();
      return;
    }

    if (!list.contains(ev.target as Node)) {
      list.scrollTop = Math.min(maxScrollTop, Math.max(0, list.scrollTop + deltaY));
      ev.preventDefault();
    }
  }

  return {
    notifRowsQuery,
    notifRows,
    unreadRowsQuery,
    unreadBadgeCount,
    markAllMutation,
    markOneMutation,
    markUnreadMutation,
    notifListRef,
    trapNotifPanelWheel,
  };
}
