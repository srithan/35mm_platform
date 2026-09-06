CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "films_catalog_created_idx"
  ON "films" ("created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "films_catalog_year_desc_idx"
  ON "films" ((coalesce("year", -1)) DESC, "id" ASC);

CREATE INDEX IF NOT EXISTS "films_catalog_year_asc_idx"
  ON "films" ((coalesce("year", 9999)), "id" ASC);

CREATE INDEX IF NOT EXISTS "films_catalog_title_sort_idx"
  ON "films" (lower("title"), "id" ASC);

CREATE INDEX IF NOT EXISTS "films_catalog_language_idx"
  ON "films" (lower("language"), "id" ASC);

CREATE INDEX IF NOT EXISTS "films_catalog_runtime_idx"
  ON "films" ("runtime", "id");

CREATE INDEX IF NOT EXISTS "films_catalog_genres_idx"
  ON "films" USING gin ("genres");

CREATE INDEX IF NOT EXISTS "films_catalog_title_search_idx"
  ON "films" USING gin (lower("title") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "films_catalog_original_title_search_idx"
  ON "films" USING gin (lower("original_title") gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "films_catalog_director_search_idx"
  ON "films" USING gin (lower("director") gin_trgm_ops);
