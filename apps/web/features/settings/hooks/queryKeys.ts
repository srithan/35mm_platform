export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => ["settings", "detail"] as const,
};
