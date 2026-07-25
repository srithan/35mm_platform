WITH "actual_films_logged" AS MATERIALIZED (
  SELECT
    "user_id",
    count(*)::integer AS "films_logged_count"
  FROM "posts"
  WHERE "type" IN ('log', 'review')
    AND "film_id" IS NOT NULL
    AND "is_repost" = false
    AND "is_deleted" = false
  GROUP BY "user_id"
),
"profile_films_logged" AS (
  SELECT
    profile."user_id",
    coalesce(actual."films_logged_count", 0)::integer AS "films_logged_count"
  FROM "profiles" AS profile
  LEFT JOIN "actual_films_logged" AS actual
    ON actual."user_id" = profile."user_id"
)
UPDATE "profiles" AS profile
SET
  "films_logged_count" = source."films_logged_count",
  "updated_at" = now()
FROM "profile_films_logged" AS source
WHERE profile."user_id" = source."user_id"
  AND profile."films_logged_count" IS DISTINCT FROM source."films_logged_count";
