export const bookmarkKeys = {
  all: ["bookmarks"] as const,
  list: (folderId?: string | null) =>
    folderId === undefined
      ? ([...bookmarkKeys.all, "list"] as const)
      : ([...bookmarkKeys.all, "list", folderId ?? "none"] as const),
  folders: () => [...bookmarkKeys.all, "folders"] as const,
};
