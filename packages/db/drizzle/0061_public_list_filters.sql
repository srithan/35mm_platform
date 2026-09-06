CREATE INDEX IF NOT EXISTS "film_lists_public_title_search_idx"
ON "film_lists" USING gin (to_tsvector('simple', "title"))
WHERE "visibility" = 'public' AND "type" = 'custom' AND "is_deleted" = false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "film_lists_public_format_popular_idx"
ON "film_lists" ("is_ranked", "like_count", "id")
WHERE "visibility" = 'public' AND "type" = 'custom' AND "is_deleted" = false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "film_lists_public_format_created_idx"
ON "film_lists" ("is_ranked", "created_at", "id")
WHERE "visibility" = 'public' AND "type" = 'custom' AND "is_deleted" = false;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "film_lists_public_size_idx"
ON "film_lists" ("entry_count")
WHERE "visibility" = 'public' AND "type" = 'custom' AND "is_deleted" = false;
