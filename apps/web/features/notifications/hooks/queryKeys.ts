export const notificationsKeys = {
  all: ["notifications"] as const,
  unread: () => ["notifications", "unread"] as const,
  content: () => ["notifications", "content"] as const,
  preview: () => ["notifications", "preview"] as const,
  /** Full follow-request list for the notifications page tray. */
  followRequests: () => ["notifications", "follow-requests"] as const,
  /** Lightweight count-only fetch for header badge (limit 1). */
  followRequestTotal: () => ["notifications", "follow-request-total"] as const,
};
