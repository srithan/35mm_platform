ALTER TABLE "films" ADD COLUMN IF NOT EXISTS "is_catalog_listed" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "idempotency_key" uuid NOT NULL,
  "request_hash" text NOT NULL,
  "purpose" text NOT NULL,
  "library_id" text NOT NULL,
  "provider_id" uuid,
  "state" text DEFAULT 'creating' NOT NULL,
  "filename" text NOT NULL,
  "content_type" text NOT NULL,
  "declared_bytes" bigint NOT NULL,
  "duration_seconds" integer,
  "width" integer,
  "height" integer,
  "failure_reason" text,
  "post_id" uuid REFERENCES "posts"("id"),
  "post_request_hash" text,
  "film_id" text REFERENCES "films"("id"),
  "details" jsonb,
  "visibility" text DEFAULT 'private' NOT NULL,
  "release_at" timestamptz,
  "published_at" timestamptz,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "next_check_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "video_assets_state_check" CHECK (state IN ('creating','uploading','processing','ready','failed')),
  CONSTRAINT "video_assets_purpose_check" CHECK (purpose IN ('post','film')),
  CONSTRAINT "video_assets_visibility_check" CHECK (visibility IN ('public','unlisted','private')),
  CONSTRAINT "video_assets_bytes_check" CHECK (declared_bytes > 0 AND declared_bytes <= 21474836480)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "video_assets_user_request_idx" ON "video_assets" ("user_id", "idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "video_assets_library_provider_idx" ON "video_assets" ("library_id", "provider_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "video_assets_film_idx" ON "video_assets" ("film_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "video_assets_post_idx" ON "video_assets" ("post_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_assets_owner_created_idx" ON "video_assets" ("user_id", "created_at" DESC, "id" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_assets_public_films_idx" ON "video_assets" ("release_at" DESC, "id" DESC)
WHERE purpose = 'film' AND visibility = 'public' AND published_at IS NOT NULL AND is_deleted = false AND state = 'ready';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_assets_pending_idx" ON "video_assets" ("next_check_at", "id")
WHERE state IN ('creating','uploading','processing') AND is_deleted = false;

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_assets_owner_films_idx" ON "video_assets" ("user_id", "release_at" DESC, "id" DESC)
WHERE purpose = 'film' AND published_at IS NOT NULL AND is_deleted = false AND state = 'ready';

--> statement-breakpoint
ALTER TABLE "video_assets" ADD COLUMN IF NOT EXISTS "staging_provider_id" uuid;
--> statement-breakpoint
ALTER TABLE "video_assets" ADD COLUMN IF NOT EXISTS "finalization_started_at" timestamptz;
