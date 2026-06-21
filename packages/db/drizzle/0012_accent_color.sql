ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "accent_color" text DEFAULT 'theme' NOT NULL;
