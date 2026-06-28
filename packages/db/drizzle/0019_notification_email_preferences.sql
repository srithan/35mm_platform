ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_email_preferences" jsonb DEFAULT '{
  "like": { "enabled": false },
  "repost": { "enabled": false },
  "follow": { "enabled": true },
  "follow_request": { "enabled": true },
  "follow_request_approved": { "enabled": true },
  "comment": { "enabled": true },
  "reply": { "enabled": true },
  "mention": { "enabled": true },
  "film_logged": { "enabled": false }
}'::jsonb NOT NULL;

ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'film_logged';
