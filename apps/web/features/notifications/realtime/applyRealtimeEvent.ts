import type { QueryClient } from "@tanstack/react-query";
import type { NotificationRealtimeEvent } from "./types";
import type { NotificationItem, NotificationPage } from "@35mm/types";
import { notificationsKeys } from "../hooks/queryKeys";

function buildNotificationFromEvent(notificationId: string, event: NotificationRealtimeEvent): NotificationItem {
  if (event.type !== "notification.new") {
    throw new Error("Invalid event type");
  }

  return {
    id: notificationId,
    type: event.notificationType
      ? (event.notificationType as NotificationItem["type"])
        : "like",
    actor: null,
    actorIds: event.actorIds ?? [],
    bundleCount: event.bundleCount && event.bundleCount >= 1 ? event.bundleCount : 1,
    createdAt: new Date().toISOString(),
    isRead: false,
    entity: event.entityId && event.entityType
      ? {
          type: event.entityType,
          id: event.entityId,
          title: null,
          thumbnailUrl: null,
        }
      : null,
  };
}

export function applyNotificationRealtimeEvent(
  queryClient: QueryClient,
  event: NotificationRealtimeEvent
) {
  if (event.type === "notification.new") {
    const current = queryClient.getQueryData<NotificationPage>(notificationsKeys.content());
    if (current) {
      const exists = current.items.some(function (item) {
        return item.id === event.notificationId;
      });

      if (exists) {
        queryClient.setQueryData(notificationsKeys.content(), {
          ...current,
          items: current.items.map(function (item) {
            if (item.id !== event.notificationId) return item;

            return {
              ...item,
              actorIds: event.actorIds ?? item.actorIds ?? [],
              bundleCount: event.bundleCount && event.bundleCount >= 1 ? event.bundleCount : item.bundleCount,
              type: event.notificationType ?? item.type,
            };
          }),
        });
        void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
        void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
        return;
      }

      const replacement = buildNotificationFromEvent(event.notificationId, event);
      queryClient.setQueryData(notificationsKeys.content(), {
        ...current,
        items: [replacement, ...current.items],
      });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
      return;
    }

    void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
    void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
    void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    return;
  }

  if (event.type === "notification.read") {
    void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
    void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
    void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
  }
}
