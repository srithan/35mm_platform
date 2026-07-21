CREATE TABLE "feed_fanout_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "author_user_id" uuid NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "locked_at" timestamp with time zone,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "feed_fanout_outbox_post_id_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade,
  CONSTRAINT "feed_fanout_outbox_author_user_id_users_id_fk"
    FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade,
  CONSTRAINT "feed_fanout_outbox_status_chk"
    CHECK ("status" IN ('pending', 'processing')),
  CONSTRAINT "feed_fanout_outbox_attempts_nonnegative_chk"
    CHECK ("attempts" >= 0)
);

CREATE UNIQUE INDEX "feed_fanout_outbox_post_id_idx"
  ON "feed_fanout_outbox" USING btree ("post_id");

CREATE INDEX "feed_fanout_outbox_status_next_attempt_created_id_idx"
  ON "feed_fanout_outbox" USING btree ("status", "next_attempt_at", "created_at", "id");
