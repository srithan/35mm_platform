ALTER TABLE "posts"
  ADD COLUMN "moderation_status" "moderation_content_status" DEFAULT 'visible' NOT NULL;
ALTER TABLE "comments"
  ADD COLUMN "moderation_status" "moderation_content_status" DEFAULT 'visible' NOT NULL;
ALTER TABLE "profiles"
  ADD COLUMN "moderation_status" "moderation_content_status" DEFAULT 'visible' NOT NULL;

UPDATE "posts" target
SET "moderation_status" = state."status"
FROM "moderation_content_state" state
WHERE state."content_type" = 'post'
  AND state."content_id" = target."id"::text
  AND state."status" <> 'visible';

UPDATE "comments" target
SET "moderation_status" = state."status"
FROM "moderation_content_state" state
WHERE state."content_type" = 'comment'
  AND state."content_id" = target."id"::text
  AND state."status" <> 'visible';

UPDATE "profiles" target
SET "moderation_status" = state."status"
FROM "moderation_content_state" state
WHERE state."content_type" = 'profile'
  AND state."content_id" = target."user_id"::text
  AND state."status" <> 'visible';

CREATE INDEX "posts_moderation_created_at_id_idx"
  ON "posts" USING btree ("moderation_status", "created_at", "id");
CREATE INDEX "comments_post_moderation_created_at_id_idx"
  ON "comments" USING btree ("post_id", "moderation_status", "created_at", "id");
CREATE INDEX "profiles_moderation_username_user_id_idx"
  ON "profiles" USING btree ("moderation_status", "username", "user_id");
