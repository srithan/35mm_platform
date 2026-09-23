import type { NotificationItem } from "@35mm/types";

function isFollowRelationshipNotification(item: NotificationItem): boolean {
  return item.type === "follow" || item.type === "follow_request" || item.type === "follow_request_approved";
}

export function getNotificationRowThumbnail(item: NotificationItem): string | undefined {
  if (isFollowRelationshipNotification(item)) {
    return undefined;
  }

  return item.entity?.thumbnailUrl ?? undefined;
}
