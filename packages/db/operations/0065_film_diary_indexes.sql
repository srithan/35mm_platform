-- Run with psql after migration 0065, before deploying the new API.
-- This file requires autocommit; never pass --single-transaction or wrap BEGIN.
\set ON_ERROR_STOP on
SET lock_timeout = '5s';
SET statement_timeout = '30min';

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "posts_user_creation_key_idx" ON "posts" ("user_id", "creation_key") WHERE "creation_key" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "posts_user_diary_watch_date_idx" ON "posts" (
  "user_id", (coalesce("watched_on", ("created_at" AT TIME ZONE 'UTC')::date)) DESC,
  "created_at" DESC, "id" DESC
) WHERE "type" IN ('log', 'review') AND "is_repost" = false AND "is_deleted" = false;

-- Validation scans existing rows with a lock compatible with ordinary writes.
ALTER TABLE "posts" VALIDATE CONSTRAINT "posts_watch_details_check";
ALTER TABLE "posts" VALIDATE CONSTRAINT "posts_creation_key_hash_check";

-- Failed concurrent builds can leave invalid indexes. IF NOT EXISTS must not
-- disguise that state: abort until the named invalid index is rebuilt.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_index
    WHERE indexrelid = to_regclass('posts_user_creation_key_idx')
      AND indisvalid AND indisready
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_index
    WHERE indexrelid = to_regclass('posts_user_diary_watch_date_idx')
      AND indisvalid AND indisready
  ) THEN
    RAISE EXCEPTION 'Film diary index build incomplete. Drop only the invalid named index CONCURRENTLY, rerun this file, and verify before deploying the API.';
  END IF;
END $$;
