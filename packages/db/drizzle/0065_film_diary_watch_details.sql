-- Apply with the transactional Drizzle migrator. Build indexes and validate
-- constraints using operations/0065_film_diary_indexes.sql before deploying API.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "watched_on" date;
ALTER TABLE "posts" ADD COLUMN "is_rewatch" boolean DEFAULT false NOT NULL;
ALTER TABLE "posts" ADD COLUMN "creation_key" uuid;
ALTER TABLE "posts" ADD COLUMN "creation_request_hash" text;
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_watch_details_check"
  CHECK ("type" IN ('log', 'review') OR ("watched_on" IS NULL AND "is_rewatch" = false)) NOT VALID;
ALTER TABLE "posts" ADD CONSTRAINT "posts_creation_key_hash_check"
  CHECK (("creation_key" IS NULL) = ("creation_request_hash" IS NULL)) NOT VALID;
--> statement-breakpoint
ALTER TABLE "post_edits" ADD COLUMN "type" "post_type";
ALTER TABLE "post_edits" ADD COLUMN "film_id" text;
ALTER TABLE "post_edits" ADD COLUMN "film_rating" smallint;
ALTER TABLE "post_edits" ADD COLUMN "watched_on" date;
ALTER TABLE "post_edits" ADD COLUMN "is_rewatch" boolean;
ALTER TABLE "post_edits" ADD COLUMN "visibility" "post_visibility";
