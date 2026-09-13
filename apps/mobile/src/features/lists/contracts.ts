import type {
  FilmListDetail,
  FilmListEntriesPage,
  FilmListEntry,
  FilmListFilm,
  FilmListPage,
  FilmListSummary,
  PublicUser,
} from "@35mm/types";

const LIST_TYPES = new Set<FilmListSummary["type"]>(["custom", "watchlist"]);
const VISIBILITIES = new Set<FilmListSummary["visibility"]>(["public", "private"]);

function record(value: unknown, contract: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringField(value: Record<string, unknown>, key: string, contract: string): string {
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    throw new Error(`${contract}.${key} must be a non-empty string.`);
  }
  return field;
}

function nullableStringField(value: Record<string, unknown>, key: string, contract: string): string | null {
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "string") {
    throw new Error(`${contract}.${key} must be a string or null.`);
  }
  return field;
}

function optionalNullableStringField(
  value: Record<string, unknown>,
  key: string,
  contract: string,
): string | null | undefined {
  if (!(key in value)) return undefined;
  return nullableStringField(value, key, contract);
}

function optionalCountField(
  value: Record<string, unknown>,
  key: string,
  contract: string,
): number | null | undefined {
  if (!(key in value)) return undefined;
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "number" || !Number.isSafeInteger(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative integer or null.`);
  }
  return field;
}

function booleanField(value: Record<string, unknown>, key: string, contract: string): boolean {
  const field = value[key];
  if (typeof field !== "boolean") {
    throw new Error(`${contract}.${key} must be a boolean.`);
  }
  return field;
}

function countField(value: Record<string, unknown>, key: string, contract: string): number {
  const field = value[key];
  if (typeof field !== "number" || !Number.isSafeInteger(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative integer.`);
  }
  return field;
}

function nullableCountField(value: Record<string, unknown>, key: string, contract: string): number | null {
  const field = value[key];
  if (field === null) return null;
  if (typeof field !== "number" || !Number.isSafeInteger(field) || field < 0) {
    throw new Error(`${contract}.${key} must be a non-negative integer or null.`);
  }
  return field;
}

function isoDateField(value: Record<string, unknown>, key: string, contract: string): string {
  const field = stringField(value, key, contract);
  if (!Number.isFinite(Date.parse(field))) {
    throw new Error(`${contract}.${key} must be an ISO date.`);
  }
  return field;
}

function stringArrayField(value: Record<string, unknown>, key: string, contract: string): string[] {
  const field = value[key];
  if (!Array.isArray(field) || field.some((item) => typeof item !== "string")) {
    throw new Error(`${contract}.${key} must be a string array.`);
  }
  return field;
}

function nullableStringArrayField(value: Record<string, unknown>, key: string, contract: string): (string | null)[] {
  const field = value[key];
  if (!Array.isArray(field) || field.some((item) => item !== null && typeof item !== "string")) {
    throw new Error(`${contract}.${key} must be an array of strings or nulls.`);
  }
  return field;
}

export function parsePublicUser(value: unknown): PublicUser {
  const user = record(value, "PublicUser");
  const avatarUrlLg = optionalNullableStringField(user, "avatarUrlLg", "PublicUser");
  const role = optionalNullableStringField(user, "role", "PublicUser");
  const roleContext = optionalNullableStringField(user, "roleContext", "PublicUser");
  const filmsLoggedCount = optionalCountField(user, "filmsLoggedCount", "PublicUser");
  return {
    id: stringField(user, "id", "PublicUser"),
    username: stringField(user, "username", "PublicUser"),
    displayName: stringField(user, "displayName", "PublicUser"),
    avatarUrl: optionalNullableStringField(user, "avatarUrl", "PublicUser") ?? null,
    ...(avatarUrlLg !== undefined ? { avatarUrlLg } : {}),
    ...(role !== undefined ? { role } : {}),
    ...(roleContext !== undefined ? { roleContext } : {}),
    ...(filmsLoggedCount !== undefined ? { filmsLoggedCount } : {}),
  };
}

export function parseFilmListFilm(value: unknown): FilmListFilm {
  const film = record(value, "FilmListFilm");
  return {
    id: stringField(film, "id", "FilmListFilm"),
    title: stringField(film, "title", "FilmListFilm"),
    year: nullableCountField(film, "year", "FilmListFilm"),
    posterUrl: nullableStringField(film, "posterUrl", "FilmListFilm"),
    genres: stringArrayField(film, "genres", "FilmListFilm"),
  };
}

export function parseFilmListEntry(value: unknown): FilmListEntry {
  const entry = record(value, "FilmListEntry");
  return {
    id: stringField(entry, "id", "FilmListEntry"),
    film: parseFilmListFilm(entry.film),
    position: nullableCountField(entry, "position", "FilmListEntry"),
    note: nullableStringField(entry, "note", "FilmListEntry"),
    addedAt: isoDateField(entry, "addedAt", "FilmListEntry"),
  };
}

export function parseFilmListEntriesPage(value: unknown): FilmListEntriesPage {
  const page = record(value, "FilmListEntriesPage");
  if (!Array.isArray(page.items)) {
    throw new Error("FilmListEntriesPage.items must be an array.");
  }
  return {
    items: page.items.map(parseFilmListEntry),
    nextCursor: nullableStringField(page, "nextCursor", "FilmListEntriesPage"),
    hasMore: booleanField(page, "hasMore", "FilmListEntriesPage"),
  };
}

export function parseFilmListSummary(value: unknown): FilmListSummary {
  const list = record(value, "FilmListSummary");
  const type = list.type;
  const visibility = list.visibility;
  if (!LIST_TYPES.has(type as FilmListSummary["type"])) {
    throw new Error("FilmListSummary.type is invalid.");
  }
  if (!VISIBILITIES.has(visibility as FilmListSummary["visibility"])) {
    throw new Error("FilmListSummary.visibility is invalid.");
  }
  return {
    id: stringField(list, "id", "FilmListSummary"),
    userId: stringField(list, "userId", "FilmListSummary"),
    type: type as FilmListSummary["type"],
    title: stringField(list, "title", "FilmListSummary"),
    description: nullableStringField(list, "description", "FilmListSummary"),
    visibility: visibility as FilmListSummary["visibility"],
    isRanked: booleanField(list, "isRanked", "FilmListSummary"),
    tags: stringArrayField(list, "tags", "FilmListSummary"),
    shareSlug: stringField(list, "shareSlug", "FilmListSummary"),
    likeCount: countField(list, "likeCount", "FilmListSummary"),
    commentCount: countField(list, "commentCount", "FilmListSummary"),
    entryCount: countField(list, "entryCount", "FilmListSummary"),
    isLiked: booleanField(list, "isLiked", "FilmListSummary"),
    isOwner: booleanField(list, "isOwner", "FilmListSummary"),
    createdAt: isoDateField(list, "createdAt", "FilmListSummary"),
    updatedAt: isoDateField(list, "updatedAt", "FilmListSummary"),
    owner: parsePublicUser(list.owner),
    posterUrls: nullableStringArrayField(list, "posterUrls", "FilmListSummary"),
  };
}

export function parseFilmListDetail(value: unknown): FilmListDetail {
  const detail = record(value, "FilmListDetail");
  if (!Array.isArray(detail.entries)) {
    throw new Error("FilmListDetail.entries must be an array.");
  }
  const summary = parseFilmListSummary(value);
  return {
    ...summary,
    entries: detail.entries.map(parseFilmListEntry),
    ...(detail.entriesPage === undefined ? {} : { entriesPage: parseFilmListEntriesPage(detail.entriesPage) }),
    clonedFromListId: nullableStringField(detail, "clonedFromListId", "FilmListDetail"),
  };
}

export function parseFilmListPage(value: unknown): FilmListPage {
  const page = record(value, "FilmListPage");
  if (!Array.isArray(page.items)) {
    throw new Error("FilmListPage.items must be an array.");
  }
  return {
    items: page.items.map(parseFilmListSummary),
    nextCursor: nullableStringField(page, "nextCursor", "FilmListPage"),
    hasMore: booleanField(page, "hasMore", "FilmListPage"),
  };
}
