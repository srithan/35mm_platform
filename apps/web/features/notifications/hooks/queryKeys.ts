export const notificationsKeys = {
  all: ["notifications"] as const,
  unread: () => ["notifications", "unread"] as const,
  content: () => ["notifications", "content"] as const,
  preview: () => ["notifications", "preview"] as const,
};
