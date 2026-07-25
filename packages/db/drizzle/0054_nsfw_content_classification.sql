ALTER TABLE "posts"
  ADD COLUMN "nsfw_status" text DEFAULT 'none' NOT NULL,
  ADD COLUMN "nsfw_categories" text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN "nsfw_source" text,
  ADD COLUMN "nsfw_scanned_at" timestamp with time zone;

ALTER TABLE "comments"
  ADD COLUMN "nsfw_status" text DEFAULT 'none' NOT NULL,
  ADD COLUMN "nsfw_categories" text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN "nsfw_source" text,
  ADD COLUMN "nsfw_scanned_at" timestamp with time zone;

ALTER TABLE "posts"
  ADD CONSTRAINT "posts_nsfw_status_check"
  CHECK ("nsfw_status" IN ('none', 'pending', 'flagged'));

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_nsfw_status_check"
  CHECK ("nsfw_status" IN ('none', 'pending', 'flagged'));

CREATE INDEX "posts_nsfw_pending_idx"
  ON "posts" ("nsfw_status", "created_at", "id")
  WHERE "nsfw_status" = 'pending';

CREATE INDEX "comments_nsfw_pending_idx"
  ON "comments" ("nsfw_status", "created_at", "id")
  WHERE "nsfw_status" = 'pending';
