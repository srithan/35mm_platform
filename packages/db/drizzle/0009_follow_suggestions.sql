CREATE TABLE "follow_suggestions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "suggested_user_id" text NOT NULL,
  "score" real NOT NULL DEFAULT 0,
  "signal_type" text NOT NULL DEFAULT 'fof',
  "computed_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "fs_user_idx" ON "follow_suggestions" ("user_id");
CREATE UNIQUE INDEX "fs_unique_pair" ON "follow_suggestions" ("user_id", "suggested_user_id");
