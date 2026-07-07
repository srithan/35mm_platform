import { asc, gt } from "drizzle-orm";
import { films } from "@35mm/db/schema";
import { initDb, getDb } from "../lib/db.js";
import { batchStageCatalogEdits } from "../modules/catalog/mutations.js";

var DEFAULT_CHUNK_SIZE = 100;

function requiredEnv(name: string): string {
  var value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

function slugify(value: string): string {
  var slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  return slug || "untitled";
}

function sortTitle(value: string): string {
  return value.trim().replace(/^(the|a|an)\s+/i, "").toLowerCase();
}

async function main() {
  initDb(requiredEnv("DATABASE_URL"));
  var chunkSize = Number(process.env.CATALOG_FILMS_BACKFILL_CHUNK_SIZE ?? DEFAULT_CHUNK_SIZE);
  if (!Number.isFinite(chunkSize)) chunkSize = DEFAULT_CHUNK_SIZE;
  chunkSize = Math.max(10, Math.min(Math.floor(chunkSize), 500));

  var cursor: string | null = null;
  var total = 0;
  var failed = 0;

  while (true) {
    var rows = await getDb()
      .select()
      .from(films)
      .where(cursor ? gt(films.id, cursor) : undefined)
      .orderBy(asc(films.id))
      .limit(chunkSize);

    if (rows.length === 0) break;

    var result = await batchStageCatalogEdits(rows.map(function (film) {
      var yearPart = film.year ? "-" + film.year : "";
      return {
        actorUserId: null,
        source: "system" as const,
        summary: "Backfill film into catalog title",
        rationale: "films to catalog_titles migration",
        idempotencyKey: "films-to-catalog:" + film.id,
        publicVisible: false,
        sourceSnapshotAt: film.updatedAt.toISOString(),
        operations: [{
          entityType: "title" as const,
          action: "create" as const,
          entityId: film.id,
          data: {
            legacyFilmId: film.id,
            type: "movie" as const,
            lifecycle: film.year ? "released" as const : "unknown" as const,
            primaryTitle: film.title,
            originalTitle: film.originalTitle,
            sortTitle: sortTitle(film.title),
            slug: slugify(film.title) + yearPart + "-" + film.id.toLowerCase(),
            synopsis: film.overview,
            startYear: film.year,
            runtimeMinutes: film.runtime,
            primaryLanguage: film.language,
            primaryCountry: film.country,
            facts: {
              genres: film.genres,
            },
            isVerified: film.isVerified,
          },
          publicVisible: false,
        }],
        sources: film.tmdbId
          ? [{
              entityType: "title" as const,
              entityId: film.id,
              url: "https://www.themoviedb.org/movie/" + film.tmdbId,
              title: "TMDB",
              publisher: "The Movie Database",
              accessedAt: new Date().toISOString(),
            }]
          : [],
      };
    }), { chunkSize });

    var chunkFailed = result.diagnostics.filter(function (item) {
      return !item.ok;
    });
    failed += chunkFailed.length;
    total += rows.length;
    console.log("[catalog.backfill.films] chunk", {
      cursor,
      rows: rows.length,
      chunkSize,
      failed: chunkFailed.length,
    });
    if (chunkFailed.length > 0) {
      console.error("[catalog.backfill.films] diagnostics", chunkFailed);
    }

    cursor = rows[rows.length - 1].id;
  }

  console.log("[catalog.backfill.films] complete", { total, failed, chunkSize });
}

void main().catch(function (error) {
  console.error("[catalog.backfill.films] failed", error);
  process.exitCode = 1;
});
