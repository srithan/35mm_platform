CREATE TABLE IF NOT EXISTS "search_index_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processing_started_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "search_index_jobs_entity_type_chk"
    CHECK ("entity_type" IN ('film', 'profile', 'post')),
  CONSTRAINT "search_index_jobs_status_chk"
    CHECK ("status" IN ('pending', 'processing', 'processed', 'failed'))
);

CREATE INDEX IF NOT EXISTS "search_index_jobs_unprocessed_idx"
  ON "search_index_jobs" ("created_at", "id")
  WHERE "processed_at" IS NULL;

CREATE INDEX IF NOT EXISTS "search_index_jobs_status_available_idx"
  ON "search_index_jobs" ("status", "available_at", "id");

CREATE INDEX IF NOT EXISTS "search_index_jobs_entity_idx"
  ON "search_index_jobs" ("entity_type", "entity_id", "created_at");

CREATE OR REPLACE FUNCTION "enqueue_search_index_job"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payload jsonb;
  resolved_entity_id text;
BEGIN
  payload := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  resolved_entity_id := payload ->> TG_ARGV[1];
  IF resolved_entity_id IS NULL OR resolved_entity_id = '' THEN
    RAISE EXCEPTION 'Search index trigger could not resolve % from %.%', TG_ARGV[1], TG_TABLE_SCHEMA, TG_TABLE_NAME;
  END IF;

  INSERT INTO "search_index_jobs" ("entity_type", "entity_id")
  VALUES (TG_ARGV[0], resolved_entity_id);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "films_search_index_trigger" ON "films";
CREATE TRIGGER "films_search_index_trigger"
AFTER INSERT OR DELETE OR UPDATE OF
  "title", "original_title", "year", "overview", "poster_url", "genres",
  "director", "is_verified"
ON "films"
FOR EACH ROW EXECUTE FUNCTION "enqueue_search_index_job"('film', 'id');

DROP TRIGGER IF EXISTS "profiles_search_index_trigger" ON "profiles";
CREATE TRIGGER "profiles_search_index_trigger"
AFTER INSERT OR DELETE OR UPDATE OF
  "username", "display_name", "bio", "avatar_url", "avatar_variants", "role",
  "headline", "is_private", "moderation_status", "follower_count"
ON "profiles"
FOR EACH ROW EXECUTE FUNCTION "enqueue_search_index_job"('profile', 'user_id');

DROP TRIGGER IF EXISTS "posts_search_index_trigger" ON "posts";
CREATE TRIGGER "posts_search_index_trigger"
AFTER INSERT OR DELETE OR UPDATE OF
  "headline", "body", "film_id", "visibility", "is_deleted",
  "moderation_status", "nsfw_status"
ON "posts"
FOR EACH ROW EXECUTE FUNCTION "enqueue_search_index_job"('post', 'id');

DROP TRIGGER IF EXISTS "users_search_index_trigger" ON "users";
CREATE TRIGGER "users_search_index_trigger"
AFTER DELETE OR UPDATE OF "status"
ON "users"
FOR EACH ROW EXECUTE FUNCTION "enqueue_search_index_job"('profile', 'id');
