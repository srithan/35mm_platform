export const notificationKeys = {
  all: ["notifications"] as const,
  page: (unreadOnly: boolean) => [...notificationKeys.all, "page", { unreadOnly }] as const,
};
