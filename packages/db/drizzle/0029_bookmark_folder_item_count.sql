ALTER TABLE "bookmark_folders" ADD COLUMN IF NOT EXISTS "item_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "bookmark_folders" bf
SET "item_count" = (
  SELECT COUNT(*)::integer
  FROM "post_bookmarks" pb
  WHERE pb."folder_id" = bf."id"
);
