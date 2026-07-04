ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "follower_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "following_count" integer DEFAULT 0 NOT NULL;

UPDATE "profiles" p
SET
  "follower_count" = (
    SELECT COUNT(*)::integer
    FROM "follows" f
    WHERE f."following_id" = p."user_id"
      AND f."status" = 'accepted'
  ),
  "following_count" = (
    SELECT COUNT(*)::integer
    FROM "follows" f
    WHERE f."follower_id" = p."user_id"
      AND f."status" = 'accepted'
  );
