ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "streaming_service_ids" text[]
  DEFAULT ARRAY['netflix', 'prime-video', 'hulu', 'max']::text[]
  NOT NULL;
