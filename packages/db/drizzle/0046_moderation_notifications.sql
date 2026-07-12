ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'report_status_update';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'content_moderated';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'content_under_review';
ALTER TYPE "account_status" ADD VALUE IF NOT EXISTS 'banned';

ALTER TABLE "notifications"
  ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN "source_key" text;

CREATE UNIQUE INDEX "notifications_source_key_idx"
  ON "notifications" USING btree ("source_key");

ALTER TABLE "moderation_notification_outbox"
  ADD COLUMN "report_cursor" text;
