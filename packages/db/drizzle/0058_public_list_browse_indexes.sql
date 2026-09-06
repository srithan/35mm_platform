CREATE INDEX IF NOT EXISTS "film_lists_public_browse_popular_idx"
  ON "film_lists" ("like_count", "id")
  WHERE "visibility" = 'public' AND "type" = 'custom' AND "is_deleted" = false;

CREATE INDEX IF NOT EXISTS "film_lists_public_browse_created_idx"
  ON "film_lists" ("created_at", "id")
  WHERE "visibility" = 'public' AND "type" = 'custom' AND "is_deleted" = false;
