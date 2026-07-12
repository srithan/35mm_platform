CREATE TYPE "public"."moderation_content_type" AS ENUM('post', 'comment', 'profile');
CREATE TYPE "public"."moderation_report_reason" AS ENUM('spam', 'harassment', 'hate_speech', 'violence', 'nudity_sexual_content', 'misinformation', 'self_harm', 'impersonation', 'intellectual_property', 'other');
CREATE TYPE "public"."moderation_report_status" AS ENUM('open', 'reviewing', 'actioned', 'dismissed');
CREATE TYPE "public"."moderation_actor_type" AS ENUM('staff', 'system');
CREATE TYPE "public"."moderation_action" AS ENUM('no_action', 'content_hidden', 'content_removed', 'content_warning_added', 'user_warned', 'user_suspended', 'user_banned', 'escalated');
CREATE TYPE "public"."moderation_content_status" AS ENUM('visible', 'hidden', 'removed');

CREATE TABLE "reports" (
  "id" text PRIMARY KEY NOT NULL,
  "reporter_user_id" uuid NOT NULL,
  "content_type" "moderation_content_type" NOT NULL,
  "content_id" text NOT NULL,
  "reason" "moderation_report_reason" NOT NULL,
  "details" text,
  "content_snapshot" jsonb NOT NULL,
  "status" "moderation_report_status" DEFAULT 'open' NOT NULL,
  "resolved_action_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reports_reporter_user_id_users_id_fk"
    FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "reports_id_ulid_chk" CHECK ("id" ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  CONSTRAINT "reports_content_id_not_empty_chk" CHECK (char_length(btrim("content_id")) > 0),
  CONSTRAINT "reports_details_max_2000_chk" CHECK ("details" IS NULL OR char_length("details") <= 2000)
);

CREATE TABLE "moderation_actions" (
  "id" text PRIMARY KEY NOT NULL,
  "report_id" text,
  "content_type" "moderation_content_type" NOT NULL,
  "content_id" text NOT NULL,
  "actor_type" "moderation_actor_type" NOT NULL,
  "actor_user_id" uuid,
  "action" "moderation_action" NOT NULL,
  "reason" text NOT NULL,
  "notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "moderation_actions_report_id_reports_id_fk"
    FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "moderation_actions_actor_user_id_users_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "moderation_actions_id_ulid_chk" CHECK ("id" ~ '^[0-9A-HJKMNP-TV-Z]{26}$'),
  CONSTRAINT "moderation_actions_content_id_not_empty_chk" CHECK (char_length(btrim("content_id")) > 0)
);

ALTER TABLE "reports"
  ADD CONSTRAINT "reports_resolved_action_id_moderation_actions_id_fk"
  FOREIGN KEY ("resolved_action_id") REFERENCES "public"."moderation_actions"("id") ON DELETE set null ON UPDATE no action;

CREATE TABLE "moderation_content_state" (
  "content_type" "moderation_content_type" NOT NULL,
  "content_id" text NOT NULL,
  "status" "moderation_content_status" DEFAULT 'visible' NOT NULL,
  "report_count" integer DEFAULT 0 NOT NULL,
  "last_reported_at" timestamp with time zone,
  "hidden_at" timestamp with time zone,
  "removed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "moderation_content_state_content_pk" PRIMARY KEY("content_type", "content_id"),
  CONSTRAINT "moderation_content_state_content_id_not_empty_chk" CHECK (char_length(btrim("content_id")) > 0),
  CONSTRAINT "moderation_content_state_report_count_nonnegative_chk" CHECK ("report_count" >= 0)
);

ALTER TABLE "profiles" ADD COLUMN "strike_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_strike_count_nonnegative_chk" CHECK ("strike_count" >= 0);

CREATE UNIQUE INDEX "reports_unresolved_reporter_content_idx"
  ON "reports" USING btree ("reporter_user_id", "content_type", "content_id")
  WHERE "status" IN ('open', 'reviewing');
CREATE INDEX "reports_content_created_at_idx"
  ON "reports" USING btree ("content_type", "content_id", "created_at");
CREATE INDEX "reports_status_created_at_id_idx"
  ON "reports" USING btree ("status", "created_at", "id");
CREATE INDEX "reports_reporter_created_at_id_idx"
  ON "reports" USING btree ("reporter_user_id", "created_at", "id");
CREATE INDEX "moderation_actions_content_created_at_idx"
  ON "moderation_actions" USING btree ("content_type", "content_id", "created_at");
CREATE INDEX "moderation_actions_actor_created_at_idx"
  ON "moderation_actions" USING btree ("actor_user_id", "created_at");
