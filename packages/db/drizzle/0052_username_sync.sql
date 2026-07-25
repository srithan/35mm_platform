ALTER TABLE "profiles" ADD COLUMN "pending_username" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "pending_username_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "username_auth_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_pending_username_pair_chk" CHECK (("profiles"."pending_username" is null) = ("profiles"."pending_username_requested_at" is null));--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_pending_username_lower_idx" ON "profiles" USING btree ("pending_username") WHERE "profiles"."pending_username" is not null;
