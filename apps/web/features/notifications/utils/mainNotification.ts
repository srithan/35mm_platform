import type { NotificationItem, NotificationType } from "@35mm/types";

export type MainNotificationType = Exclude<NotificationType, "chat_reaction">;
export type MainNotificationItem = NotificationItem & { type: MainNotificationType };

export function isMainNotificationItem(item: NotificationItem): item is MainNotificationItem {
  return item.type !== "chat_reaction";
}
