CREATE TABLE IF NOT EXISTS "counter_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target_table" text NOT NULL,
  "target_id" text NOT NULL,
  "counter_name" text NOT NULL,
  "delta" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "locked_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT counter_jobs_delta_nonzero_chk CHECK (delta <> 0)
);

CREATE INDEX "counter_jobs_status_created_at_idx" ON "counter_jobs" ("status", "created_at");
CREATE INDEX "counter_jobs_target_idx" ON "counter_jobs" ("target_table", "counter_name", "target_id");
