ALTER TABLE "chat_threads" ADD COLUMN IF NOT EXISTS "dm_member_low" uuid;
--> statement-breakpoint
ALTER TABLE "chat_threads" ADD COLUMN IF NOT EXISTS "dm_member_high" uuid;
--> statement-breakpoint
WITH "dm_pairs" AS (
  SELECT
    cp."thread_id",
    MIN(cp."user_id"::text)::uuid AS "dm_member_low",
    MAX(cp."user_id"::text)::uuid AS "dm_member_high"
  FROM "chat_participants" cp
  INNER JOIN "chat_threads" ct ON ct."id" = cp."thread_id"
  WHERE ct."type" = 'dm'
  GROUP BY cp."thread_id"
  HAVING COUNT(*) >= 2
)
UPDATE "chat_threads" ct
SET
  "dm_member_low" = dp."dm_member_low",
  "dm_member_high" = dp."dm_member_high"
FROM "dm_pairs" dp
WHERE ct."id" = dp."thread_id"
  AND ct."type" = 'dm';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_threads_dm_pair_idx" ON "chat_threads" (
  "dm_member_low",
  "dm_member_high"
) WHERE "type" = 'dm';
