CREATE INDEX "posts_film_type_created_at_id_idx"
ON "posts" USING btree ("film_id", "type", "created_at", "id")
WHERE "is_deleted" = false;
