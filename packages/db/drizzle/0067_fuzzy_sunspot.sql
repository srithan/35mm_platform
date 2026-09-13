-- Keep catalog writes online: new nullable columns are metadata-only, and the
-- updated CHECK is added NOT VALID to avoid scanning the posts table here.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
--> statement-breakpoint
CREATE TYPE "public"."watch_venue" AS ENUM('theater', 'streaming', 'tv', 'disc', 'digital', 'festival', 'flight', 'other');--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_watch_details_check";--> statement-breakpoint
ALTER TABLE "post_edits" ADD COLUMN "watch_venue" "watch_venue";--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "watch_venue" "watch_venue";--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_watch_details_check" CHECK ("posts"."type" in ('log', 'review') or ("posts"."watched_on" is null and "posts"."watch_venue" is null and "posts"."is_rewatch" = false)) NOT VALID;
