import type { FeedPage } from "@35mm/types";

import { parseFeedPage } from "@/features/videos/contracts";

export interface BookmarkFolder {
  readonly id: string;
  readonly name: string;
  readonly itemCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BookmarkFoldersResponse {
  readonly folders: readonly BookmarkFolder[];
  readonly unsortedCount: number;
}

export type BookmarkPage = FeedPage;

function record(value: unknown, contract: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function isoDate(value: unknown, field: string): string {
  const candidate = string(value, field);
  if (!Number.isFinite(Date.parse(candidate))) {
    throw new Error(`${field} must be an ISO date.`);
  }
  return candidate;
}

function count(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${field} must be a non-negative integer.`);
  }
  return value as number;
}

export function parseBookmarkFolder(value: unknown): BookmarkFolder {
  const folder = record(value, "BookmarkFolder");
  return {
    id: string(folder.id, "BookmarkFolder.id"),
    name: string(folder.name, "BookmarkFolder.name"),
    itemCount: count(folder.itemCount, "BookmarkFolder.itemCount"),
    createdAt: isoDate(folder.createdAt, "BookmarkFolder.createdAt"),
    updatedAt: isoDate(folder.updatedAt, "BookmarkFolder.updatedAt"),
  };
}

export function parseBookmarkFoldersResponse(value: unknown): BookmarkFoldersResponse {
  const response = record(value, "BookmarkFoldersResponse");
  if (!Array.isArray(response.folders)) {
    throw new Error("BookmarkFoldersResponse.folders must be an array.");
  }
  return {
    folders: response.folders.map(parseBookmarkFolder),
    unsortedCount: count(response.unsortedCount, "BookmarkFoldersResponse.unsortedCount"),
  };
}

export function parseBookmarkPage(value: unknown): BookmarkPage {
  return parseFeedPage(value);
}

export function parseFolderMutation(value: unknown): { readonly folder: BookmarkFolder } {
  const response = record(value, "BookmarkFolderMutation");
  return { folder: parseBookmarkFolder(response.folder) };
}

export function parseBookmarkAssignment(value: unknown): {
  readonly ok: true;
  readonly folderId: string | null;
  readonly isBookmarked?: boolean;
  readonly bookmarkCount?: number;
} {
  const response = record(value, "BookmarkAssignment");
  if (response.ok !== true) throw new Error("BookmarkAssignment.ok must be true.");
  if (response.folderId !== null && typeof response.folderId !== "string") {
    throw new Error("BookmarkAssignment.folderId must be a string or null.");
  }
  return {
    ok: true,
    folderId: response.folderId,
    ...(typeof response.isBookmarked === "boolean" ? { isBookmarked: response.isBookmarked } : {}),
    ...(response.bookmarkCount === undefined
      ? {}
      : { bookmarkCount: count(response.bookmarkCount, "BookmarkAssignment.bookmarkCount") }),
  };
}

export function parseMutationOk(value: unknown): { readonly ok: true } {
  const response = record(value, "BookmarkMutation");
  if (response.ok !== true) throw new Error("BookmarkMutation.ok must be true.");
  return { ok: true };
}
