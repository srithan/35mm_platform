export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => ["settings", "detail"] as const,
};

export const privacyKeys = {
  all: ["privacy"] as const,
  blocks: () => ["privacy", "blocks"] as const,
  mutes: () => ["privacy", "mutes"] as const,
};
