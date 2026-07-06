CREATE TABLE IF NOT EXISTS "counter_job_deltas" (
  "target_table" text NOT NULL,
  "target_id" text NOT NULL,
  "counter_name" text NOT NULL,
  "delta" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "counter_job_deltas_target_counter_idx" ON "counter_job_deltas" (
  "target_table",
  "target_id",
  "counter_name"
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "counter_job_deltas_target_table_id_idx" ON "counter_job_deltas" ("target_table", "target_id");
