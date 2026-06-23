ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "avatar_variants" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "cover_variants" jsonb;
