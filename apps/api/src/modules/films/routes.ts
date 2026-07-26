import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { films } from "@35mm/db/schema";
import { badRequest, notFound } from "../../lib/errors.js";
import { getDb } from "../../lib/db.js";
import {
  createRateLimitMiddleware,
  identifyByIp,
} from "../../lib/rateLimit.js";
import { isValidUlid } from "../../lib/ulid.js";

export var filmRoutes = new Hono();

var filmReadRateLimit = createRateLimitMiddleware({
  keyPrefix: "films:read",
  limit: 240,
  windowSeconds: 60,
  identify: identifyByIp,
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
    .where(eq(films.id, id))
    .limit(1);
  if (!rows[0]) throw notFound("Film not found");
  return c.json({
    ...rows[0],
    updatedAt: rows[0].updatedAt.toISOString(),
  });
});
