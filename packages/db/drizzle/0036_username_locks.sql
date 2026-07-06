CREATE TABLE IF NOT EXISTS "username_locks" (
  "username" text PRIMARY KEY NOT NULL,
  "state" text DEFAULT 'locked' NOT NULL,
  "owner" text DEFAULT 'studio' NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "username_locks_username_lower_chk" CHECK ("username" = lower("username")),
  CONSTRAINT "username_locks_state_chk" CHECK ("state" in ('locked', 'reserved'))
);
