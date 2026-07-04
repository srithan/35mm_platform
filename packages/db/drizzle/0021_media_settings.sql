ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "video_default_quality" text DEFAULT 'auto' NOT NULL,
  ADD COLUMN IF NOT EXISTS "video_always_show_captions" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "video_caption_style" text DEFAULT 'default' NOT NULL,
  ADD COLUMN IF NOT EXISTS "video_quiet_mode" boolean DEFAULT false NOT NULL;
