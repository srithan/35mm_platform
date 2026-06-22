DELETE FROM "feed_items" a
USING "feed_items" b
WHERE a."user_id" = b."user_id"
  AND a."post_id" = b."post_id"
  AND (
    a."created_at" < b."created_at"
    OR (a."created_at" = b."created_at" AND a."id" < b."id")
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "feed_items_user_post_idx" ON "feed_items" USING btree ("user_id","post_id");
--> statement-breakpoint
CREATE INDEX "feed_items_user_score_post_idx" ON "feed_items" USING btree ("user_id","score","post_id");
--> statement-breakpoint
CREATE INDEX "follows_following_status_created_follower_idx" ON "follows" USING btree ("following_id","status","created_at","follower_id");
