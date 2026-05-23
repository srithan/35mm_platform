import type { Post } from "@/features/feed/types/feed";

export interface BookmarkFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/** Persisted bookmark row (mock store). */
export interface BookmarkRecord {
  id: string;
  folderId: string;
  postId: string;
  postUsername: string;
  savedAt: string;
  note: string | null;
}

/** Folder + count for sidebar. */
export interface BookmarkFolderWithCount extends BookmarkFolder {
  itemCount: number;
}

/** One saved post row with resolved feed post (for list UI). */
export interface BookmarkListItem {
  bookmark: BookmarkRecord;
  post: Post;
  folderName: string;
}

export interface BookmarkSearchResult {
  query: string;
  folders: BookmarkFolder[];
  items: BookmarkListItem[];
}
