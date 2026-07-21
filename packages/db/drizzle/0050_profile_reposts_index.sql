CREATE INDEX "posts_user_repost_created_at_id_idx"
ON "posts" USING btree ("user_id", "created_at" DESC, "id" DESC)
WHERE "is_repost" = true AND "is_deleted" = false;
