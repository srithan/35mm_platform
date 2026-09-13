import type { ApiClient } from "@35mm/api-client";
import type { NotificationPage } from "@35mm/types";

import { parseMutationOk, parseNotificationPage } from "./contracts";

export function fetchNotificationsPage(
  client: ApiClient,
  input: {
    readonly cursor: string | null;
    readonly unreadOnly: boolean;
    readonly signal?: AbortSignal;
  },
): Promise<NotificationPage> {
  const query = new URLSearchParams({ limit: "20" });
  if (input.cursor) query.set("cursor", input.cursor);
  if (input.unreadOnly) query.set("unreadOnly", "true");
  return client.request(`/v1/me/notifications?${query.toString()}`, {
    auth: "required",
    operation: input.unreadOnly ? "notifications.unread" : "notifications.all",
    parser: parseNotificationPage,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}

export function markNotificationRead(
  client: ApiClient,
  notificationId: string,
  read: boolean,
): Promise<{ readonly ok: boolean }> {
  return client.request(
    `/v1/me/notifications/${encodeURIComponent(notificationId)}/${read ? "read" : "unread"}`,
    {
      auth: "required",
      method: "PATCH",
      operation: read ? "notifications.mark-read" : "notifications.mark-unread",
      parser: parseMutationOk,
      requestClass: "mutation",
    },
  );
}

export function markAllNotificationsRead(
  client: ApiClient,
): Promise<{ readonly ok: boolean }> {
  return client.request("/v1/me/notifications/read-all", {
    auth: "required",
    method: "POST",
    operation: "notifications.mark-all-read",
    parser: parseMutationOk,
    requestClass: "mutation",
  });
}
