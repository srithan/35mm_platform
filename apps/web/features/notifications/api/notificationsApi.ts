import type { NotificationPage } from "@35mm/types";
import { apiRequest } from "@/features/feed/api/http";

interface FetchNotificationsParams {
  token?: string | null;
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
}

export async function fetchNotifications(params: FetchNotificationsParams): Promise<NotificationPage> {
  var query = new URLSearchParams({
    limit: String(params.limit ?? 20),
  });

  if (params.cursor) {
    query.set("cursor", params.cursor);
  }

  if (params.unreadOnly) {
    query.set("unreadOnly", "true");
  }

  return apiRequest<NotificationPage>(`/v1/me/notifications?${query.toString()}`, {
    token: params.token,
  });
}

export async function markNotificationRead(params: {
  token?: string | null;
  notificationId: string;
}): Promise<{ ok: boolean; updated: boolean }> {
  return apiRequest(`/v1/me/notifications/${encodeURIComponent(params.notificationId)}/read`, {
    method: "PATCH",
    token: params.token,
  });
}

export async function markNotificationUnread(params: {
  token?: string | null;
  notificationId: string;
}): Promise<{ ok: boolean; updated: boolean }> {
  return apiRequest(`/v1/me/notifications/${encodeURIComponent(params.notificationId)}/unread`, {
    method: "PATCH",
    token: params.token,
  });
}

export async function markAllNotificationsRead(params: {
  token?: string | null;
}): Promise<{ ok: boolean; updatedCount: number }> {
  return apiRequest("/v1/me/notifications/read-all", {
    method: "POST",
    token: params.token,
  });
}

export async function acceptFollowRequest(params: {
  token?: string | null;
  userId: string;
}): Promise<{ ok: true; accepted: boolean }> {
  return apiRequest(`/v1/follows/${encodeURIComponent(params.userId)}/accept`, {
    method: "POST",
    token: params.token,
  });
}

export async function declineFollowRequest(params: {
  token?: string | null;
  userId: string;
}): Promise<{ ok: true; declined: boolean }> {
  return apiRequest(`/v1/follows/${encodeURIComponent(params.userId)}/request`, {
    method: "DELETE",
    token: params.token,
  });
}
