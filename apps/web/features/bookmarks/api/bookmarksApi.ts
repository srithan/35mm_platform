import { adaptPostToFeedType } from "@/features/feed/api/adapters";
import { getPost } from "@/features/feed/data/mockPosts";
import type { Post } from "@/features/feed/types/feed";
import type {
  BookmarkFolder,
  BookmarkFolderWithCount,
  BookmarkListItem,
  BookmarkRecord,
  BookmarkSearchResult,
} from "../types";
import {
  createFolder,
  deleteFolder,
  folderById,
  listFoldersSnapshot,
  listItemsSnapshot,
  listRecordsForFolder,
  moveRecord,
  removeRecord,
  renameFolder,
} from "../mock/bookmarksStore";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const jitter = () => delay(120 + Math.floor(Math.random() * 180));

export function resolveBookmarkPost(username: string, postId: string): Post | null {
  const raw = getPost(username, postId);
  if (!raw) return null;
  return adaptPostToFeedType(raw);
}

function toListItem(record: BookmarkRecord): BookmarkListItem | null {
  const post = resolveBookmarkPost(record.postUsername, record.postId);
  if (!post) return null;
  const folder = folderById(record.folderId);
  return {
    bookmark: { ...record },
    post,
    folderName: folder?.name ?? "Folder",
  };
}

function sortItemsBySavedDesc(a: BookmarkListItem, b: BookmarkListItem): number {
  return new Date(b.bookmark.savedAt).getTime() - new Date(a.bookmark.savedAt).getTime();
}

export async function fetchBookmarkFoldersWithCounts(): Promise<BookmarkFolderWithCount[]> {
  await jitter();
  if (Math.random() < 0.02) {
    throw new Error("Bookmarks service temporarily unavailable");
  }
  const folderList = listFoldersSnapshot();
  const allItems = listItemsSnapshot();
  return folderList.map((f) => ({
    ...f,
    itemCount: allItems.filter((r) => r.folderId === f.id).length,
  }));
}

export async function fetchBookmarkItems(folderId: string | null): Promise<BookmarkListItem[]> {
  await jitter();
  const records = listRecordsForFolder(folderId);
  const rows: BookmarkListItem[] = [];
  for (let i = 0; i < records.length; i++) {
    const row = toListItem(records[i]);
    if (row) rows.push(row);
  }
  rows.sort(sortItemsBySavedDesc);
  return rows;
}

function buildSearchHaystack(post: Post): string {
  return (
    post.author.displayName +
    " " +
    post.author.username +
    " " +
    post.body
  ).toLowerCase();
}

export async function searchBookmarks(query: string): Promise<BookmarkSearchResult> {
  await jitter();
  const q = query.trim().toLowerCase();
  if (!q) {
    return { query: "", folders: [], items: [] };
  }
  const folderList = listFoldersSnapshot();
  const matchedFolders = folderList.filter((f) => f.name.toLowerCase().includes(q));

  const allRecords = listItemsSnapshot();
  const matchedItems: BookmarkListItem[] = [];
  for (let i = 0; i < allRecords.length; i++) {
    const post = resolveBookmarkPost(allRecords[i].postUsername, allRecords[i].postId);
    if (!post) continue;
    if (buildSearchHaystack(post).includes(q)) {
      const folder = folderById(allRecords[i].folderId);
      matchedItems.push({
        bookmark: { ...allRecords[i] },
        post,
        folderName: folder?.name ?? "Folder",
      });
    }
  }
  matchedItems.sort(sortItemsBySavedDesc);
  return {
    query: query.trim(),
    folders: matchedFolders.map((f) => ({ ...f })),
    items: matchedItems.slice(0, 80),
  };
}

export async function apiCreateFolder(name: string): Promise<BookmarkFolder> {
  await jitter();
  return createFolder(name);
}

export async function apiRenameFolder(folderId: string, name: string): Promise<BookmarkFolder> {
  await jitter();
  const updated = renameFolder(folderId, name);
  if (!updated) {
    throw new Error("Folder not found or invalid name");
  }
  return updated;
}

export async function apiDeleteFolder(folderId: string): Promise<void> {
  await jitter();
  deleteFolder(folderId);
}

export async function apiMoveBookmark(bookmarkId: string, targetFolderId: string): Promise<void> {
  await jitter();
  const ok = moveRecord(bookmarkId, targetFolderId);
  if (!ok) {
    throw new Error("Could not move bookmark");
  }
}

export async function apiRemoveBookmark(bookmarkId: string): Promise<void> {
  await jitter();
  const ok = removeRecord(bookmarkId);
  if (!ok) {
    throw new Error("Bookmark not found");
  }
}
