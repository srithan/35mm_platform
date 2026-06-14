import { and, eq, sql } from "drizzle-orm";
import { filmListEntries, filmLists, films } from "@35mm/db/schema";
import type { ResolveCatalogFilmInput, ResolveOnboardingTmdbFilmInput } from "@35mm/validators";
import { getDb } from "./db.js";
import { badRequest, notFound } from "./errors.js";
import { createUlid, isValidUlid } from "./ulid.js";

function watchlistShareSlug(userId: string): string {
  return `watchlist-${userId}`;
}

function isMissingFilmListSchemaError(err: unknown): boolean {
  if (err == null || typeof err !== "object") return false;
  var candidate = err as {
    code?: unknown;
    message?: unknown;
    cause?: {
      code?: unknown;
      message?: unknown;
    };
  };
  var code = typeof candidate.code === "string" ? candidate.code : "";
  var causeCode =
    candidate.cause && typeof candidate.cause.code === "string"
      ? candidate.cause.code
      : "";
  var message = typeof candidate.message === "string" ? candidate.message : "";
  var causeMessage =
    candidate.cause && typeof candidate.cause.message === "string"
      ? candidate.cause.message
      : "";

  return (
    code === "42P01" ||
    causeCode === "42P01" ||
    message.includes("film_lists") ||
    causeMessage.includes("film_lists")
  );
}

export async function ensureWatchlistForUser(userId: string): Promise<string> {
  var db = getDb();
  var existing = await db
    .select({ id: filmLists.id })
    .from(filmLists)
    .where(and(eq(filmLists.userId, userId), eq(filmLists.type, "watchlist"), eq(filmLists.isDeleted, false)))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  var id = createUlid();
  if (!isValidUlid(id)) {
    throw badRequest("Generated list ID is not a valid ULID");
  }

  var inserted = await db
    .insert(filmLists)
    .values({
      id,
      userId,
      type: "watchlist",
      title: "Watchlist",
      description: null,
      visibility: "private",
      isRanked: false,
      tags: [],
      shareSlug: watchlistShareSlug(userId),
    })
    .onConflictDoNothing()
    .returning({ id: filmLists.id });

  if (inserted.length > 0) return inserted[0].id;

  var resolved = await db
    .select({ id: filmLists.id })
    .from(filmLists)
    .where(and(eq(filmLists.userId, userId), eq(filmLists.type, "watchlist"), eq(filmLists.isDeleted, false)))
    .limit(1);

  if (resolved.length === 0) {
    throw badRequest("Unable to create watchlist");
  }

  return resolved[0].id;
}

export async function tryEnsureWatchlistForUser(userId: string): Promise<string | null> {
  try {
    return await ensureWatchlistForUser(userId);
  } catch (err) {
    if (isMissingFilmListSchemaError(err)) {
      console.warn("[film-lists] schema missing; skipping watchlist bootstrap");
      return null;
    }
    throw err;
  }
}

export async function resolveFilmId(input: {
  filmId?: string;
  film?: ResolveOnboardingTmdbFilmInput;
  catalogFilm?: ResolveCatalogFilmInput;
}): Promise<string> {
  var db = getDb();

  if (input.filmId) {
    if (!isValidUlid(input.filmId)) {
      throw badRequest("filmId must be a 35mm ULID");
    }
    var existingById = await db
      .select({ id: films.id })
      .from(films)
      .where(eq(films.id, input.filmId))
      .limit(1);
    if (existingById.length === 0) throw notFound("Film not found");
    return existingById[0].id;
  }

  if (!input.film && !input.catalogFilm) {
    throw badRequest("Provide filmId or film metadata");
  }

  if (input.catalogFilm) {
    var existingCatalogRows = await db
      .select({ id: films.id })
      .from(films)
      .where(
        and(
          eq(films.source, "35mm"),
          eq(films.title, input.catalogFilm.title),
          input.catalogFilm.year == null
            ? sql`${films.year} is null`
            : eq(films.year, input.catalogFilm.year)
        )
      )
      .limit(1);

    if (existingCatalogRows.length > 0) return existingCatalogRows[0].id;

    var catalogId = createUlid();
    if (!isValidUlid(catalogId)) {
      throw badRequest("Generated film ID is not a valid ULID");
    }

    await db.insert(films).values({
      id: catalogId,
      tmdbId: null,
      title: input.catalogFilm.title,
      year: input.catalogFilm.year ?? null,
      posterUrl: input.catalogFilm.posterUrl ?? null,
      genres: input.catalogFilm.genres,
      director: input.catalogFilm.director ?? null,
      overview: input.catalogFilm.overview ?? null,
      source: "35mm",
    });

    return catalogId;
  }

  if (!input.film) {
    throw badRequest("Provide film metadata");
  }

  var existingByTmdb = await db
    .select({ id: films.id })
    .from(films)
    .where(eq(films.tmdbId, input.film.tmdbId))
    .limit(1);

  if (existingByTmdb.length > 0) return existingByTmdb[0].id;

  var id = createUlid();
  if (!isValidUlid(id)) {
    throw badRequest("Generated film ID is not a valid ULID");
  }

  var inserted = await db
    .insert(films)
    .values({
      id,
      tmdbId: input.film.tmdbId,
      title: input.film.title,
      year: input.film.year ?? null,
      posterUrl: input.film.posterUrl ?? null,
      genres: input.film.genres,
      source: "tmdb_import",
    })
    .onConflictDoNothing()
    .returning({ id: films.id });

  if (inserted.length > 0) return inserted[0].id;

  var resolved = await db
    .select({ id: films.id })
    .from(films)
    .where(eq(films.tmdbId, input.film.tmdbId))
    .limit(1);

  if (resolved.length === 0) {
    throw badRequest("Unable to resolve film");
  }

  return resolved[0].id;
}

export async function nextListPosition(listId: string): Promise<number> {
  var db = getDb();
  var rows = await db
    .select({ maxPosition: sql<number>`coalesce(max(${filmListEntries.position}), 0)` })
    .from(filmListEntries)
    .where(eq(filmListEntries.listId, listId));

  return Number(rows[0]?.maxPosition ?? 0) + 10;
}
