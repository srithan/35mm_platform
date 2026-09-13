export type BookmarkFilterId = string | null | undefined;

export const bookmarkKeys = {
  all: ["bookmarks"] as const,
  folders: () => [...bookmarkKeys.all, "folders"] as const,
  lists: () => [...bookmarkKeys.all, "lists"] as const,
  list: (folderId: BookmarkFilterId) => [
    ...bookmarkKeys.lists(),
    { folderId: folderId ?? (folderId === null ? null : "all") },
  ] as const,
};
