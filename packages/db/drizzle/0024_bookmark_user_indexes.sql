CREATE UNIQUE INDEX IF NOT EXISTS "post_bookmarks_post_user_idx" ON "post_bookmarks" ("post_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_bookmarks_folder_id_idx" ON "post_bookmarks" ("folder_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_bookmarks_user_created_post_idx" ON "post_bookmarks" ("user_id", "created_at", "post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_bookmarks_user_folder_created_post_idx" ON "post_bookmarks" (
  "user_id",
  "folder_id",
  "created_at",
  "post_id"
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmark_folders_user_id_idx" ON "bookmark_folders" ("user_id");
