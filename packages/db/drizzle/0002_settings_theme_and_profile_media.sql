ALTER TABLE "profiles" ALTER COLUMN "bio" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "user_settings"
  ADD COLUMN "theme" text DEFAULT 'auto' NOT NULL,
  ADD COLUMN "video_autoplay" boolean DEFAULT true NOT NULL;
