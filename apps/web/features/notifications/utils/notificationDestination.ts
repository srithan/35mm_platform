import type { NotificationItem } from "@35mm/types";
import { ROUTES } from "@/lib/constants/routes";

type NotificationDestinationInput = Pick<NotificationItem, "actor" | "entity" | "type">;

export function getNotificationDestination(item: NotificationDestinationInput): string {
  const entity = item.entity;

  if (
    item.type === "comment" ||
    item.type === "reply" ||
    item.type === "like" ||
    item.type === "repost" ||
    item.type === "mention"
  ) {
    if (entity?.type === "comment" && entity.postId && entity.username) {
      return ROUTES.POST(entity.username, entity.postId);
    }

    if (entity?.type === "post" && entity.id && entity.username) {
      return ROUTES.POST(entity.username, entity.id);
    }
  }

  if ((item.type === "follow" || item.type === "follow_request" || item.type === "follow_request_approved") && item.actor?.username) {
    return ROUTES.PROFILE(item.actor.username);
  }

  if ((item.type === "mention" || item.type === "comment" || item.type === "reply") && item.actor?.username) {
    return ROUTES.PROFILE(item.actor.username);
  }

  return ROUTES.NOTIFICATIONS;
}
