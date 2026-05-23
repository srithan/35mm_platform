import type { BookmarkFolder, BookmarkRecord } from "../types";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

const SEED_FOLDERS: BookmarkFolder[] = [
  {
    id: "fld-watch-later",
    name: "Watch later",
    createdAt: isoDaysAgo(90),
    updatedAt: isoDaysAgo(1),
  },
  {
    id: "fld-references",
    name: "References & essays",
    createdAt: isoDaysAgo(60),
    updatedAt: isoDaysAgo(3),
  },
  {
    id: "fld-craft",
    name: "Craft & lighting",
    createdAt: isoDaysAgo(45),
    updatedAt: isoDaysAgo(7),
  },
  {
    id: "fld-empty",
    name: "Ideas (empty)",
    createdAt: isoDaysAgo(10),
    updatedAt: isoDaysAgo(10),
  },
];

/** Pairs must exist in `EXTENDED_MOCK_POSTS` / `getPost`. */
const SEED_ITEMS: Omit<BookmarkRecord, "id">[] = [
  { folderId: "fld-watch-later", postId: "1", postUsername: "maya.frames", savedAt: isoDaysAgo(2), note: null },
  { folderId: "fld-watch-later", postId: "3", postUsername: "lena.montage", savedAt: isoDaysAgo(5), note: null },
  { folderId: "fld-watch-later", postId: "5", postUsername: "j.pellicola", savedAt: isoDaysAgo(8), note: "DP thread" },
  { folderId: "fld-references", postId: "7", postUsername: "filmsbratz", savedAt: isoDaysAgo(12), note: null },
  { folderId: "fld-references", postId: "9", postUsername: "cecegkh", savedAt: isoDaysAgo(14), note: null },
  { folderId: "fld-references", postId: "10", postUsername: "BestMovieMom", savedAt: isoDaysAgo(18), note: null },
  { folderId: "fld-craft", postId: "2", postUsername: "oliver_cuts", savedAt: isoDaysAgo(4), note: "Grade ref" },
  { folderId: "fld-craft", postId: "4", postUsername: "rania.films", savedAt: isoDaysAgo(6), note: null },
  { folderId: "fld-craft", postId: "6", postUsername: "MarvelsGrantMan136", savedAt: isoDaysAgo(9), note: null },
  { folderId: "fld-craft", postId: "8", postUsername: "photrodgraphyd", savedAt: isoDaysAgo(11), note: null },
  { folderId: "fld-watch-later", postId: "12", postUsername: "EvanLuthra", savedAt: isoDaysAgo(1), note: null },
  { folderId: "fld-references", postId: "13", postUsername: "SceneinCinema", savedAt: isoDaysAgo(20), note: null },
];

let folders: BookmarkFolder[] = SEED_FOLDERS.map((f) => ({ ...f }));
let items: BookmarkRecord[] = SEED_ITEMS.map((row, i) => ({
  ...row,
  id: "bm-seed-" + String(i + 1),
}));

let idCounter = SEED_ITEMS.length + 1;

export function resetBookmarkStoreForTests(): void {
  folders = SEED_FOLDERS.map((f) => ({ ...f }));
  items = SEED_ITEMS.map((row, i) => ({
    ...row,
    id: "bm-seed-" + String(i + 1),
  }));
  idCounter = SEED_ITEMS.length + 1;
}

export function listFoldersSnapshot(): BookmarkFolder[] {
  return folders.map((f) => ({ ...f }));
}

export function listItemsSnapshot(): BookmarkRecord[] {
  return items.map((r) => ({ ...r }));
}

export function createFolder(name: string): BookmarkFolder {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Folder name is required");
  }
  const now = new Date().toISOString();
  const folder: BookmarkFolder = {
    id: "fld-" + Date.now() + "-" + idCounter++,
    name: trimmed,
    createdAt: now,
    updatedAt: now,
  };
  folders = [folder, ...folders];
  return { ...folder };
}

export function renameFolder(folderId: string, name: string): BookmarkFolder | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const idx = folders.findIndex((f) => f.id === folderId);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  folders[idx] = { ...folders[idx], name: trimmed, updatedAt: now };
  return { ...folders[idx] };
}

export function deleteFolder(folderId: string): void {
  folders = folders.filter((f) => f.id !== folderId);
  items = items.filter((r) => r.folderId !== folderId);
}

export function listRecordsForFolder(folderId: string | null): BookmarkRecord[] {
  if (folderId == null) {
    return items.map((r) => ({ ...r }));
  }
  return items.filter((r) => r.folderId === folderId).map((r) => ({ ...r }));
}

export function moveRecord(bookmarkId: string, targetFolderId: string): boolean {
  if (!folders.some((f) => f.id === targetFolderId)) return false;
  const idx = items.findIndex((r) => r.id === bookmarkId);
  if (idx === -1) return false;
  const now = new Date().toISOString();
  items[idx] = {
    ...items[idx],
    folderId: targetFolderId,
    savedAt: now,
  };
  const fi = folders.findIndex((f) => f.id === targetFolderId);
  if (fi !== -1) {
    folders[fi] = { ...folders[fi], updatedAt: now };
  }
  return true;
}

export function removeRecord(bookmarkId: string): boolean {
  const before = items.length;
  items = items.filter((r) => r.id !== bookmarkId);
  return items.length < before;
}

export function folderById(id: string): BookmarkFolder | undefined {
  return folders.find((f) => f.id === id);
}
