ALTER TYPE "public"."catalog_entity_type" ADD VALUE IF NOT EXISTS 'title_genre';

ALTER TABLE "catalog_title_genres"
  ADD COLUMN IF NOT EXISTS "id" text;

ALTER TABLE "catalog_title_genres"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;

UPDATE "catalog_title_genres"
SET "id" = 'TG' || upper(substr(md5("title_id" || ':' || "genre_id"), 1, 24))
WHERE "id" IS NULL;

ALTER TABLE "catalog_title_genres"
  ALTER COLUMN "id" SET NOT NULL;

ALTER TABLE "catalog_title_genres"
  ADD CONSTRAINT "catalog_title_genres_pkey" PRIMARY KEY ("id");

DROP INDEX IF EXISTS "catalog_title_genres_title_sort_idx";
CREATE INDEX IF NOT EXISTS "catalog_title_genres_title_sort_idx"
  ON "catalog_title_genres" USING btree ("title_id", "sort_order", "id");
