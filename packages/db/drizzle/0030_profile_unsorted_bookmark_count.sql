ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "unsorted_bookmark_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "profiles" p
SET "unsorted_bookmark_count" = (
  SELECT COUNT(*)::integer
  FROM "post_bookmarks" pb
  WHERE pb."user_id" = p."user_id"
    AND pb."folder_id" IS NULL
);
