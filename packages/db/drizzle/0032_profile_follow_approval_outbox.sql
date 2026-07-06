CREATE TABLE IF NOT EXISTS "profile_follow_approval_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "cursor" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "locked_at" timestamp with time zone,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "profile_follow_approval_outbox_target_user_id_idx" ON "profile_follow_approval_outbox" ("target_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_follow_approval_outbox_status_next_attempt_idx" ON "profile_follow_approval_outbox" ("status", "next_attempt_at");
