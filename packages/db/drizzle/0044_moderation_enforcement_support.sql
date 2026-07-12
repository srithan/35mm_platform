ALTER TABLE "moderation_actions" ADD COLUMN "idempotency_key" text;
ALTER TABLE "moderation_actions" ADD COLUMN "subject_user_id" uuid;
ALTER TABLE "moderation_actions"
  ADD CONSTRAINT "moderation_actions_subject_user_id_users_id_fk"
  FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "moderation_actions"
  ADD CONSTRAINT "moderation_actions_idempotency_key_length_chk"
  CHECK ("idempotency_key" IS NULL OR char_length("idempotency_key") BETWEEN 8 AND 120);

CREATE UNIQUE INDEX "moderation_actions_actor_idempotency_idx"
  ON "moderation_actions" USING btree ("actor_user_id", "idempotency_key");
CREATE INDEX "moderation_actions_subject_created_at_id_idx"
  ON "moderation_actions" USING btree ("subject_user_id", "created_at", "id");

CREATE INDEX "moderation_content_state_queue_idx"
  ON "moderation_content_state" USING btree ("report_count" DESC, "last_reported_at" DESC, "content_type", "content_id");

CREATE TABLE "moderation_notification_outbox" (
  "id" text PRIMARY KEY NOT NULL,
  "action_id" text NOT NULL,
  "resolution" "moderation_report_status" NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "moderation_notification_outbox_action_id_moderation_actions_id_fk"
    FOREIGN KEY ("action_id") REFERENCES "public"."moderation_actions"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "moderation_notification_outbox_id_ulid_chk"
    CHECK ("id" ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  CONSTRAINT "moderation_notification_outbox_resolution_chk"
    CHECK ("resolution" IN ('actioned', 'dismissed')),
  CONSTRAINT "moderation_notification_outbox_status_chk"
    CHECK ("status" IN ('pending', 'processing', 'processed', 'failed')),
  CONSTRAINT "moderation_notification_outbox_attempt_count_nonnegative_chk"
    CHECK ("attempt_count" >= 0)
);

CREATE UNIQUE INDEX "moderation_notification_outbox_action_idx"
  ON "moderation_notification_outbox" USING btree ("action_id");
CREATE INDEX "moderation_notification_outbox_unprocessed_idx"
  ON "moderation_notification_outbox" USING btree ("available_at", "id")
  WHERE "processed_at" IS NULL;
