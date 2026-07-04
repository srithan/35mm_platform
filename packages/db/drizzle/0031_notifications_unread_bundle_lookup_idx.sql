CREATE INDEX "notifications_unread_bundle_lookup_idx" ON "notifications" (
  "recipient_id",
  "type",
  "entity_type",
  "entity_id",
  "created_at"
) WHERE "is_read" = false;
