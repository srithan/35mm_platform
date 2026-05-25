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
    isVerified: boolean("is_verified").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      tmdbIdUniqueIdx: uniqueIndex("films_tmdb_id_idx").on(table.tmdbId),
      imdbIdUniqueIdx: uniqueIndex("films_imdb_id_idx").on(table.imdbId),
      titleYearIdx: index("films_title_year_idx").on(table.title, table.year),
    };
  }
);
