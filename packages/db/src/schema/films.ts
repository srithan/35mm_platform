import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  pgEnum,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export var filmSourceEnum = pgEnum("film_source", [
  "35mm",
  "tmdb_import",
  "user_contributed",
]);

export var films = pgTable(
  "films",
  {
    id: text("id").primaryKey(),
    tmdbId: integer("tmdb_id"),
    imdbId: text("imdb_id"),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    year: integer("year"),
    runtime: integer("runtime"),
    overview: text("overview"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    genres: text("genres").array().default(sql`'{}'::text[]`).notNull(),
    director: text("director"),
    language: text("language"),
    country: text("country"),
    source: filmSourceEnum("source").notNull(),
    contributedByUserId: uuid("contributed_by_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    isCatalogListed: boolean("is_catalog_listed").default(true).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      tmdbIdUniqueIdx: uniqueIndex("films_tmdb_id_idx").on(table.tmdbId),
      imdbIdUniqueIdx: uniqueIndex("films_imdb_id_idx").on(table.imdbId),
      titleYearIdx: index("films_title_year_idx").on(table.title, table.year),
      catalogCreatedIdx: index("films_catalog_created_idx").on(
        table.createdAt.desc(),
        table.id.desc()
      ),
      catalogYearDescIdx: index("films_catalog_year_desc_idx").on(
        sql`coalesce(${table.year}, -1) desc`,
        table.id.asc()
      ),
      catalogYearAscIdx: index("films_catalog_year_asc_idx").on(
        sql`coalesce(${table.year}, 9999)`,
        table.id.asc()
      ),
      catalogTitleSortIdx: index("films_catalog_title_sort_idx").on(
        sql`lower(${table.title})`,
        table.id.asc()
      ),
      catalogLanguageIdx: index("films_catalog_language_idx").on(
        sql`lower(${table.language})`,
        table.id.asc()
      ),
      catalogRuntimeIdx: index("films_catalog_runtime_idx").on(table.runtime, table.id),
      catalogGenresIdx: index("films_catalog_genres_idx").using("gin", table.genres),
      catalogTitleSearchIdx: index("films_catalog_title_search_idx").using(
        "gin",
        sql`lower(${table.title}) gin_trgm_ops`
      ),
      catalogOriginalTitleSearchIdx: index("films_catalog_original_title_search_idx").using(
        "gin",
        sql`lower(${table.originalTitle}) gin_trgm_ops`
      ),
      catalogDirectorSearchIdx: index("films_catalog_director_search_idx").using(
        "gin",
        sql`lower(${table.director}) gin_trgm_ops`
      ),
    };
  }
);
