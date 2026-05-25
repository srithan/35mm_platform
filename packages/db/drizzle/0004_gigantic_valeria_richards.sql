ALTER TABLE "profiles" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "favorite_film_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "favorite_genre_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "headline_context" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "films_logged_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_headline_max_50_chk" CHECK (char_length("profiles"."headline") <= 50);--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_headline_context_max_25_chk" CHECK (char_length("profiles"."headline_context") <= 25);