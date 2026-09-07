ALTER TABLE "posts" ADD COLUMN "quote_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "posts" AS post
SET "quote_count" = source."quote_count"
FROM (
  SELECT
    "quoted_post_id" AS "id",
    count(*)::integer AS "quote_count"
  FROM "posts"
  WHERE "quoted_post_id" IS NOT NULL
    AND "is_repost" = false
    AND "is_deleted" = false
  GROUP BY "quoted_post_id"
) AS source
WHERE post."id" = source."id";
