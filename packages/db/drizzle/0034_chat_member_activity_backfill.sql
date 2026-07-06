UPDATE "chat_member_state" cms
SET "last_message_at" = ctm."last_message_at"
FROM "chat_thread_meta" ctm
WHERE cms."thread_id" = ctm."thread_id"
  AND ctm."last_message_at" IS NOT NULL
  AND (
    cms."last_message_at" IS NULL
    OR cms."last_message_at" < ctm."last_message_at"
  );
