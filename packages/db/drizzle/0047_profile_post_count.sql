ALTER TABLE "profiles" ADD COLUMN "post_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "profiles" AS profile
SET "post_count" = source."post_count"
FROM (
  SELECT
    "user_id",
    count(*)::integer AS "post_count"
  FROM "posts"
  WHERE "is_deleted" = false
  GROUP BY "user_id"
) AS source
WHERE profile."user_id" = source."user_id";
--> statement-breakpoint
ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_post_count_nonnegative_chk"
CHECK ("profiles"."post_count" >= 0);
