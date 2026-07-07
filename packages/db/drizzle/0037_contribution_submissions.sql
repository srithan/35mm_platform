CREATE TYPE "public"."contribution_kind" AS ENUM(
  'add_title',
  'edit_title',
  'credits',
  'person_update',
  'media',
  'awards_events',
  'duplicate_titles',
  'merge_people',
  'split_person'
);

CREATE TYPE "public"."contribution_status" AS ENUM(
  'pending',
  'in_review',
  'approved',
  'rejected'
);

CREATE TABLE IF NOT EXISTS "contribution_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "kind" "contribution_kind" NOT NULL,
  "title" text NOT NULL,
  "summary" text NOT NULL,
  "entity_type" text,
  "entity_id" text,
  "payload" jsonb NOT NULL,
  "status" "contribution_status" DEFAULT 'pending' NOT NULL,
  "reviewer_user_id" uuid,
  "review_note" text,
  "idempotency_key" text NOT NULL,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  CONSTRAINT "contribution_submissions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "contribution_submissions_reviewer_user_id_users_id_fk"
    FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "contribution_submissions_user_created_id_idx"
  ON "contribution_submissions" USING btree ("user_id", "created_at", "id");
CREATE INDEX IF NOT EXISTS "contribution_submissions_status_created_id_idx"
  ON "contribution_submissions" USING btree ("status", "created_at", "id");
CREATE INDEX IF NOT EXISTS "contribution_submissions_entity_idx"
  ON "contribution_submissions" USING btree ("entity_type", "entity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "contribution_submissions_user_idempotency_idx"
  ON "contribution_submissions" USING btree ("user_id", "idempotency_key");
