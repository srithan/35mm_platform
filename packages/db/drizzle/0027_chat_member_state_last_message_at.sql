ALTER TABLE "chat_member_state" ADD COLUMN IF NOT EXISTS "last_message_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_member_state_user_inbox_idx" ON "chat_member_state" (
  "user_id",
  "deleted_at",
  "last_message_at" DESC,
  "thread_id"
);
