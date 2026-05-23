export const bookmarkKeys = {
  all: ["bookmarks"] as const,
  folders: () => [...bookmarkKeys.all, "folders"] as const,
  items: (folderId: string | null) => [...bookmarkKeys.all, "items", folderId ?? "all"] as const,
  search: (q: string) => [...bookmarkKeys.all, "search", q] as const,
};
