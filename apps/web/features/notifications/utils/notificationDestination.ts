import type { NotificationItem } from "@35mm/types";
import { ROUTES } from "@/lib/constants/routes";

type NotificationDestinationInput = Pick<NotificationItem, "actor" | "entity" | "metadata" | "type">;

export function getNotificationDestination(item: NotificationDestinationInput): string {
  const entity = item.entity;

  if (item.type === "report_status_update") {
    const reportId = typeof item.metadata.reportId === "string"
      ? item.metadata.reportId.trim()
      : "";
    return reportId
      ? ROUTES.SETTINGS_PRIVACY_REPORT(reportId)
      : ROUTES.SETTINGS_PRIVACY_REPORTS;
  }

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

  if (item.type === "chat_reaction" && entity?.type === "chat_thread" && entity.id) {
    return ROUTES.CHAT_WITH(entity.id);
  }

  if ((item.type === "follow" || item.type === "follow_request" || item.type === "follow_request_approved") && item.actor?.username) {
    return ROUTES.PROFILE(item.actor.username);
  }

  if (item.type === "film_logged") {
    return ROUTES.NOTIFICATIONS;
  }

  if ((item.type === "mention" || item.type === "comment" || item.type === "reply") && item.actor?.username) {
    return ROUTES.PROFILE(item.actor.username);
  }

  return ROUTES.NOTIFICATIONS;
}
