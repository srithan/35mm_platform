import { Hono } from "hono";
import { and, asc, desc, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { films } from "@35mm/db/schema";
import { filmCatalogQuerySchema, resolveOnboardingTmdbFilmSchema } from "@35mm/validators";
import type { FilmCatalogSort } from "@35mm/types";
import { badRequest, notFound } from "../../lib/errors.js";
import { getDb } from "../../lib/db.js";
import {
  createRateLimitMiddleware,
  identifyByIp,
  identifyByUserId,
} from "../../lib/rateLimit.js";
import { isValidUlid } from "../../lib/ulid.js";
import { requireAuth } from "../../lib/middleware.js";
import { resolveFilmId } from "../../lib/filmLists.js";

export var filmRoutes = new Hono();

var filmReadRateLimit = createRateLimitMiddleware({
  keyPrefix: "films:read",
  limit: 240,
  windowSeconds: 60,
  identify: identifyByIp,
});

var filmResolveRateLimit = createRateLimitMiddleware({
  keyPrefix: "films:resolve",
  limit: 60,
  windowSeconds: 60,
  identify: identifyByUserId,
});

type FilmCatalogCursor = {
  sort: FilmCatalogSort;
  value: string | number;
  id: string;
};

var MOOD_GENRES: Record<string, string[]> = {
  light: ["Comedy", "Romance", "Animation"],
  cry: ["Drama", "Family"],
  edge: ["Thriller", "Horror", "Crime"],
  think: ["Mystery", "Documentary", "Science Fiction"],
  late: ["Horror", "Thriller", "Mystery"],
  together: ["Romance", "Family", "Comedy"],
};

function encodeFilmCatalogCursor(cursor: FilmCatalogCursor): string {
  return Buffer.from(
    JSON.stringify({ s: cursor.sort, v: cursor.value, i: cursor.id }),
    "utf8"
  ).toString("base64url");
}

function decodeFilmCatalogCursor(
  encoded: string | undefined,
  sort: FilmCatalogSort
): FilmCatalogCursor | null {
  if (!encoded) return null;
  try {
    var parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as { s?: unknown; v?: unknown; i?: unknown };
    if (
      parsed.s !== sort ||
      (typeof parsed.v !== "string" && typeof parsed.v !== "number") ||
      typeof parsed.i !== "string" ||
      parsed.i.length === 0
    ) {
      throw new Error("invalid-shape");
    }
    if (
      (sort === "popular" || sort === "recently_added") &&
      Number.isNaN(new Date(parsed.v).getTime())
    ) {
      throw new Error("invalid-date");
    }
    if (
      (sort === "year_desc" || sort === "year_asc") &&
      typeof parsed.v !== "number"
    ) {
      throw new Error("invalid-year");
    }
    return { sort, value: parsed.v, id: parsed.i };
  } catch (_error) {
    throw badRequest("Invalid cursor");
  }
}

function catalogCursorFilter(cursor: FilmCatalogCursor | null): SQL | undefined {
  if (!cursor) return undefined;
  if (cursor.sort === "popular" || cursor.sort === "recently_added") {
    var createdAt = new Date(cursor.value);
    return sql`(${films.createdAt} < ${createdAt} or (${films.createdAt} = ${createdAt} and ${films.id} < ${cursor.id}))`;
  }
  if (cursor.sort === "title_asc") {
    return sql`(lower(${films.title}) > ${cursor.value} or (lower(${films.title}) = ${cursor.value} and ${films.id} > ${cursor.id}))`;
  }
  var nullYear = cursor.sort === "year_desc" ? -1 : 9999;
  var operator = cursor.sort === "year_desc" ? sql`<` : sql`>`;
  return sql`(coalesce(${films.year}, ${nullYear}) ${operator} ${cursor.value} or (coalesce(${films.year}, ${nullYear}) = ${cursor.value} and ${films.id} > ${cursor.id}))`;
}

filmRoutes.get("/", filmReadRateLimit, async function (c) {
  var parsed = filmCatalogQuerySchema.safeParse({
    cursor: c.req.query("cursor") || undefined,
    limit: c.req.query("limit") || undefined,
    q: c.req.query("q") || undefined,
    sort: c.req.query("sort") || undefined,
    mood: c.req.query("mood") || undefined,
    type: c.req.query("type") || undefined,
    genre: c.req.query("genre") || undefined,
    decade: c.req.query("decade") || undefined,
    language: c.req.query("language") || undefined,
    duration: c.req.query("duration") || undefined,
  });
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid film filters");
  }

  var input = parsed.data;
  var cursor = decodeFilmCatalogCursor(input.cursor, input.sort);
  var filters: SQL[] = [eq(films.isCatalogListed, true)];

  if (input.q) {
    var escapedQuery = input.q
      .toLocaleLowerCase("en")
      .replace(/[\\%_]/g, function (character) { return "\\" + character; });
    var term = "%" + escapedQuery + "%";
    filters.push(sql`(
      lower(${films.title}) like ${term} escape '\\'
      or lower(coalesce(${films.originalTitle}, '')) like ${term} escape '\\'
      or lower(coalesce(${films.director}, '')) like ${term} escape '\\'
    )`);
  }
  if (input.genre) {
    filters.push(sql`${input.genre} = any(${films.genres})`);
  }
  if (input.decade !== undefined) {
    filters.push(gte(films.year, input.decade));
    filters.push(lte(films.year, input.decade + 9));
  }
  if (input.language) {
    filters.push(sql`lower(coalesce(${films.language}, '')) = ${input.language.toLowerCase()}`);
  }
  if (input.duration === "under_90") filters.push(sql`${films.runtime} < 90`);
  if (input.duration === "90_to_120") {
    filters.push(gte(films.runtime, 90));
    filters.push(lte(films.runtime, 120));
  }
  if (input.duration === "over_120") filters.push(sql`${films.runtime} > 120`);
  if (input.type === "short_film") filters.push(sql`${films.runtime} <= 40`);
  if (input.type === "documentary") {
    filters.push(sql`'Documentary' = any(${films.genres})`);
  }
  if (input.type === "tv_show" || input.type === "web_series" || input.type === "mini_series") {
    // Legacy `films` rows are movie records. Series live in the normalized title
    // catalog and TMDB fallback; never mislabel a movie as a series here.
    filters.push(sql`false`);
  }
  if (input.mood === "short") {
    filters.push(sql`${films.runtime} < 90`);
  } else if (input.mood !== "all") {
    var moodGenres = MOOD_GENRES[input.mood];
    if (moodGenres) {
      var moodGenreArray = sql.join(
        moodGenres.map(function (genre) { return sql`${genre}`; }),
        sql`, `
      );
      filters.push(sql`${films.genres} && array[${moodGenreArray}]::text[]`);
    }
  }
  var afterCursor = catalogCursorFilter(cursor);
  if (afterCursor) filters.push(afterCursor);

  var ordering: SQL[];
  if (input.sort === "title_asc") {
    ordering = [asc(sql`lower(${films.title})`), asc(films.id)];
  } else if (input.sort === "year_desc") {
    ordering = [desc(sql`coalesce(${films.year}, -1)`), asc(films.id)];
  } else if (input.sort === "year_asc") {
    ordering = [asc(sql`coalesce(${films.year}, 9999)`), asc(films.id)];
  } else {
    ordering = [desc(films.createdAt), desc(films.id)];
  }

  var rows = await getDb()
    .select({
      id: films.id,
      tmdbId: films.tmdbId,
      mediaType: sql<"movie">`'movie'`,
      title: films.title,
      originalTitle: films.originalTitle,
      year: films.year,
      runtime: films.runtime,
      posterUrl: films.posterUrl,
      genres: films.genres,
      director: films.director,
      language: films.language,
      country: films.country,
      isVerified: films.isVerified,
      createdAt: films.createdAt,
    })
    .from(films)
    .where(and(...filters))
    .orderBy(...ordering)
    .limit(input.limit + 1);

  var hasMore = rows.length > input.limit;
  var visible = rows.slice(0, input.limit);
  var tail = visible[visible.length - 1];
  var nextCursor: string | null = null;
  if (hasMore && tail) {
    var value: string | number;
    if (input.sort === "popular" || input.sort === "recently_added") value = tail.createdAt.toISOString();
    else if (input.sort === "title_asc") value = tail.title.toLocaleLowerCase("en");
    else if (input.sort === "year_desc") value = tail.year ?? -1;
    else value = tail.year ?? 9999;
    nextCursor = encodeFilmCatalogCursor({ sort: input.sort, value, id: tail.id });
  }

  c.header("Cache-Control", "public, max-age=30, s-maxage=120, stale-while-revalidate=300");
  return c.json({
    items: visible.map(function ({ createdAt: _createdAt, ...film }) {
      return film;
    }),
    nextCursor,
    hasMore,
  });
});

filmRoutes.post("/resolve", requireAuth, filmResolveRateLimit, async function (c) {
  var parsed = resolveOnboardingTmdbFilmSchema.safeParse(await c.req.json().catch(function () {
    return null;
  }));
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid TMDB film");
  }
  var filmId = await resolveFilmId({ film: parsed.data });
  return c.json({ filmId });
});

// Read-only bridge for legacy TMDB title URLs. Social reads still use films.id.
filmRoutes.get("/tmdb/:tmdbId", filmReadRateLimit, async function (c) {
  var raw = c.req.param("tmdbId");
  var tmdbId = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(tmdbId) || tmdbId <= 0 || tmdbId > 2147483647) {
    throw badRequest("Invalid TMDB film ID");
  }
  var rows = await getDb().select({ filmId: films.id }).from(films)
    .where(and(eq(films.tmdbId, tmdbId), eq(films.isCatalogListed, true))).limit(1);
  c.header("Cache-Control", "no-store");
  return c.json({ filmId: rows[0]?.filmId ?? null });
});

filmRoutes.get("/:id", filmReadRateLimit, async function (c) {
  var id = c.req.param("id").trim().toUpperCase();
  if (!isValidUlid(id)) throw badRequest("Invalid film ID");
  var rows = await getDb()
    .select({
      id: films.id,
      tmdbId: films.tmdbId,
      imdbId: films.imdbId,
      title: films.title,
      originalTitle: films.originalTitle,
      year: films.year,
      runtime: films.runtime,
      overview: films.overview,
      posterUrl: films.posterUrl,
      backdropUrl: films.backdropUrl,
      genres: films.genres,
      director: films.director,
      language: films.language,
      country: films.country,
      isVerified: films.isVerified,
      updatedAt: films.updatedAt,
    })
    .from(films)
    .where(and(eq(films.id, id), eq(films.isCatalogListed, true)))
    .limit(1);
  if (!rows[0]) throw notFound("Film not found");
  return c.json({
    ...rows[0],
    updatedAt: rows[0].updatedAt.toISOString(),
  });
});
