export const notificationsKeys = {
  all: ["notifications"] as const,
  content: () => ["notifications", "content"] as const,
};
