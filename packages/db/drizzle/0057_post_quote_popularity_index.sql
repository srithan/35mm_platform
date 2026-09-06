CREATE INDEX IF NOT EXISTS "posts_quoted_post_id_like_count_created_at_id_idx"
ON "posts" USING btree (
  "quoted_post_id",
  "like_count" DESC NULLS LAST,
  "created_at" DESC NULLS LAST,
  "id" DESC NULLS LAST
)
WHERE "posts"."quoted_post_id" is not null
  and "posts"."is_repost" = false
  and "posts"."is_deleted" = false;
