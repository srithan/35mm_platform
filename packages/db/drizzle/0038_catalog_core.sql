CREATE TYPE "public"."catalog_title_type" AS ENUM(
  'movie',
  'short_film',
  'documentary',
  'tv_series',
  'web_series',
  'tv_season',
  'tv_episode',
  'tv_special',
  'video',
  'other'
);

CREATE TYPE "public"."catalog_title_lifecycle" AS ENUM(
  'unknown',
  'announced',
  'in_production',
  'released',
  'ended',
  'canceled'
);

CREATE TYPE "public"."catalog_entity_status" AS ENUM(
  'active',
  'merged',
  'deleted',
  'locked'
);

CREATE TYPE "public"."catalog_entity_type" AS ENUM(
  'title',
  'person',
  'credit',
  'company',
  'title_company',
  'award',
  'award_event',
  'award_nomination',
  'media_asset',
  'external_id',
  'alias',
  'title_relation',
  'source'
);

CREATE TYPE "public"."catalog_alias_type" AS ENUM(
  'primary',
  'original',
  'localized',
  'alternative',
  'working',
  'festival',
  'legal',
  'search'
);

CREATE TYPE "public"."catalog_relation_type" AS ENUM(
  'sequel',
  'prequel',
  'remake',
  'spin_off',
  'adaptation',
  'alternate_version',
  'compilation',
  'related'
);

CREATE TYPE "public"."catalog_credit_department" AS ENUM(
  'cast',
  'directing',
  'writing',
  'production',
  'camera',
  'editing',
  'sound',
  'music',
  'art',
  'costume',
  'makeup',
  'visual_effects',
  'stunts',
  'animation',
  'crew',
  'other'
);

CREATE TYPE "public"."catalog_company_type" AS ENUM(
  'studio',
  'production_company',
  'distributor',
  'network',
  'streamer',
  'sales_agent',
  'festival',
  'school',
  'collective',
  'other'
);

CREATE TYPE "public"."catalog_company_role" AS ENUM(
  'studio',
  'production',
  'distribution',
  'network',
  'streaming',
  'sales',
  'rights_holder',
  'other'
);

CREATE TYPE "public"."catalog_award_outcome" AS ENUM(
  'nominee',
  'winner',
  'honoree',
  'shortlisted',
  'screened',
  'official_selection'
);

CREATE TYPE "public"."catalog_media_type" AS ENUM(
  'poster',
  'backdrop',
  'still',
  'headshot',
  'logo',
  'trailer',
  'clip',
  'featurette',
  'external_video'
);

CREATE TYPE "public"."catalog_media_source" AS ENUM(
  'r2',
  'cloudflare_images',
  'external_url',
  'youtube',
  'vimeo',
  'tmdb',
  'imdb',
  'official',
  'other'
);

CREATE TYPE "public"."catalog_external_provider" AS ENUM(
  'imdb',
  'tmdb',
  'wikidata',
  'letterboxd',
  'thetvdb',
  'official_site',
  'youtube',
  'vimeo',
  'instagram',
  'wikipedia',
  'other'
);

CREATE TYPE "public"."catalog_edit_source" AS ENUM(
  'studio',
  'contribution',
  'import',
  'system'
);

CREATE TYPE "public"."catalog_edit_status" AS ENUM(
  'applied',
  'pending_review',
  'rejected',
  'reverted',
  'superseded'
);

CREATE TYPE "public"."catalog_revision_action" AS ENUM(
  'create',
  'update',
  'delete',
  'restore',
  'merge',
  'split'
);

CREATE TYPE "public"."catalog_revision_storage_tier" AS ENUM(
  'hot',
  'archived'
);

CREATE TYPE "public"."catalog_index_job_status" AS ENUM(
  'pending',
  'processing',
  'processed',
  'failed'
);

CREATE TABLE IF NOT EXISTS "catalog_titles" (
  "id" text PRIMARY KEY NOT NULL,
  "legacy_film_id" text,
  "type" "catalog_title_type" NOT NULL,
  "lifecycle" "catalog_title_lifecycle" DEFAULT 'unknown' NOT NULL,
  "status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
  "primary_title" text NOT NULL,
  "original_title" text,
  "sort_title" text NOT NULL,
  "slug" text NOT NULL,
  "synopsis" text,
  "start_year" integer,
  "end_year" integer,
  "release_date" text,
  "runtime_minutes" integer,
  "primary_language" text,
  "primary_country" text,
  "origin_countries" text[] DEFAULT '{}'::text[] NOT NULL,
  "spoken_languages" text[] DEFAULT '{}'::text[] NOT NULL,
  "facts" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "parent_title_id" text,
  "season_number" integer,
  "episode_number" integer,
  "absolute_episode_number" integer,
  "is_adult" boolean DEFAULT false NOT NULL,
  "is_verified" boolean DEFAULT false NOT NULL,
  "locked_at" timestamp with time zone,
  "locked_by_user_id" uuid,
  "merged_into_title_id" text,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_titles_legacy_film_id_films_id_fk"
    FOREIGN KEY ("legacy_film_id") REFERENCES "public"."films"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_titles_parent_title_id_catalog_titles_id_fk"
    FOREIGN KEY ("parent_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_titles_locked_by_user_id_users_id_fk"
    FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_titles_merged_into_title_id_catalog_titles_id_fk"
    FOREIGN KEY ("merged_into_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_titles_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_titles_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_people" (
  "id" text PRIMARY KEY NOT NULL,
  "status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
  "primary_name" text NOT NULL,
  "sort_name" text NOT NULL,
  "slug" text NOT NULL,
  "biography" text,
  "birth_date" text,
  "death_date" text,
  "birth_place" text,
  "death_place" text,
  "primary_professions" text[] DEFAULT '{}'::text[] NOT NULL,
  "gender" text,
  "is_verified" boolean DEFAULT false NOT NULL,
  "locked_at" timestamp with time zone,
  "locked_by_user_id" uuid,
  "merged_into_person_id" text,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_people_locked_by_user_id_users_id_fk"
    FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_people_merged_into_person_id_catalog_people_id_fk"
    FOREIGN KEY ("merged_into_person_id") REFERENCES "public"."catalog_people"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_people_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_people_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_companies" (
  "id" text PRIMARY KEY NOT NULL,
  "status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
  "type" "catalog_company_type" DEFAULT 'other' NOT NULL,
  "name" text NOT NULL,
  "sort_name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "country" text,
  "founded_year" integer,
  "dissolved_year" integer,
  "official_url" text,
  "is_verified" boolean DEFAULT false NOT NULL,
  "merged_into_company_id" text,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_companies_merged_into_company_id_catalog_companies_id_fk"
    FOREIGN KEY ("merged_into_company_id") REFERENCES "public"."catalog_companies"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_companies_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_companies_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_title_relations" (
  "id" text PRIMARY KEY NOT NULL,
  "from_title_id" text NOT NULL,
  "to_title_id" text NOT NULL,
  "type" "catalog_relation_type" NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_title_relations_from_title_id_catalog_titles_id_fk"
    FOREIGN KEY ("from_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_title_relations_to_title_id_catalog_titles_id_fk"
    FOREIGN KEY ("to_title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_credits" (
  "id" text PRIMARY KEY NOT NULL,
  "title_id" text NOT NULL,
  "person_id" text NOT NULL,
  "department" "catalog_credit_department" NOT NULL,
  "job" text NOT NULL,
  "character_name" text,
  "credited_as" text,
  "billing_order" integer DEFAULT 0 NOT NULL,
  "episode_count" integer,
  "start_year" integer,
  "end_year" integer,
  "notes" text,
  "status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_credits_title_id_catalog_titles_id_fk"
    FOREIGN KEY ("title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_credits_person_id_catalog_people_id_fk"
    FOREIGN KEY ("person_id") REFERENCES "public"."catalog_people"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_credits_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_credits_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_title_companies" (
  "id" text PRIMARY KEY NOT NULL,
  "title_id" text NOT NULL,
  "company_id" text NOT NULL,
  "role" "catalog_company_role" NOT NULL,
  "region" text,
  "start_date" text,
  "end_date" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_title_companies_title_id_catalog_titles_id_fk"
    FOREIGN KEY ("title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_title_companies_company_id_catalog_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."catalog_companies"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_awards" (
  "id" text PRIMARY KEY NOT NULL,
  "status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
  "name" text NOT NULL,
  "original_name" text,
  "slug" text NOT NULL,
  "description" text,
  "official_url" text,
  "country" text,
  "first_year" integer,
  "last_year" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "catalog_genres" (
  "id" text PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "parent_genre_id" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_genres_parent_genre_id_catalog_genres_id_fk"
    FOREIGN KEY ("parent_genre_id") REFERENCES "public"."catalog_genres"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_title_genres" (
  "title_id" text NOT NULL,
  "genre_id" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_title_genres_title_id_catalog_titles_id_fk"
    FOREIGN KEY ("title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_title_genres_genre_id_catalog_genres_id_fk"
    FOREIGN KEY ("genre_id") REFERENCES "public"."catalog_genres"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_award_events" (
  "id" text PRIMARY KEY NOT NULL,
  "award_id" text NOT NULL,
  "name" text NOT NULL,
  "year" integer NOT NULL,
  "event_date" text,
  "location" text,
  "official_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_award_events_award_id_catalog_awards_id_fk"
    FOREIGN KEY ("award_id") REFERENCES "public"."catalog_awards"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_award_nominations" (
  "id" text PRIMARY KEY NOT NULL,
  "event_id" text NOT NULL,
  "category_name" text NOT NULL,
  "outcome" "catalog_award_outcome" NOT NULL,
  "title_id" text,
  "person_id" text,
  "company_id" text,
  "credited_name" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_award_nominations_event_id_catalog_award_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "public"."catalog_award_events"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_award_nominations_title_id_catalog_titles_id_fk"
    FOREIGN KEY ("title_id") REFERENCES "public"."catalog_titles"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_award_nominations_person_id_catalog_people_id_fk"
    FOREIGN KEY ("person_id") REFERENCES "public"."catalog_people"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_award_nominations_company_id_catalog_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "public"."catalog_companies"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_award_nominations_subject_required"
    CHECK ("title_id" IS NOT NULL OR "person_id" IS NOT NULL OR "company_id" IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS "catalog_media_assets" (
  "id" text PRIMARY KEY NOT NULL,
  "entity_type" "catalog_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "type" "catalog_media_type" NOT NULL,
  "source" "catalog_media_source" NOT NULL,
  "url" text NOT NULL,
  "storage_key" text,
  "title" text,
  "caption" text,
  "language" text,
  "region" text,
  "rights_note" text,
  "attribution" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
  "created_by_user_id" uuid,
  "updated_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_media_assets_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_media_assets_updated_by_user_id_users_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_external_ids" (
  "id" text PRIMARY KEY NOT NULL,
  "entity_type" "catalog_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "provider" "catalog_external_provider" NOT NULL,
  "external_id" text NOT NULL,
  "url" text,
  "is_primary" boolean DEFAULT false NOT NULL,
  "status" "catalog_entity_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "catalog_aliases" (
  "id" text PRIMARY KEY NOT NULL,
  "entity_type" "catalog_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "type" "catalog_alias_type" NOT NULL,
  "value" text NOT NULL,
  "sort_value" text NOT NULL,
  "language" text,
  "region" text,
  "attributes" text[] DEFAULT '{}'::text[] NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "catalog_edits" (
  "id" text PRIMARY KEY NOT NULL,
  "source" "catalog_edit_source" NOT NULL,
  "status" "catalog_edit_status" DEFAULT 'applied' NOT NULL,
  "actor_user_id" uuid,
  "summary" text NOT NULL,
  "rationale" text,
  "idempotency_key" text,
  "public_visible" boolean DEFAULT true NOT NULL,
  "reverted_by_edit_id" text,
  "reverts_edit_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_edits_actor_user_id_users_id_fk"
    FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_edits_reverted_by_edit_id_catalog_edits_id_fk"
    FOREIGN KEY ("reverted_by_edit_id") REFERENCES "public"."catalog_edits"("id") ON DELETE set null ON UPDATE no action,
  CONSTRAINT "catalog_edits_reverts_edit_id_catalog_edits_id_fk"
    FOREIGN KEY ("reverts_edit_id") REFERENCES "public"."catalog_edits"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_sources" (
  "id" text PRIMARY KEY NOT NULL,
  "edit_id" text,
  "entity_type" "catalog_entity_type",
  "entity_id" text,
  "url" text NOT NULL,
  "title" text,
  "publisher" text,
  "accessed_at" timestamp with time zone,
  "archive_url" text,
  "note" text,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_sources_edit_id_catalog_edits_id_fk"
    FOREIGN KEY ("edit_id") REFERENCES "public"."catalog_edits"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "catalog_sources_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_revisions" (
  "id" text PRIMARY KEY NOT NULL,
  "edit_id" text NOT NULL,
  "entity_type" "catalog_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "action" "catalog_revision_action" NOT NULL,
  "before_data" jsonb,
  "after_data" jsonb,
  "changed_fields" text[] DEFAULT '{}'::text[] NOT NULL,
  "storage_tier" "catalog_revision_storage_tier" DEFAULT 'hot' NOT NULL,
  "archive_object_key" text,
  "archive_sha256" text,
  "archived_at" timestamp with time zone,
  "public_visible" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_revisions_edit_id_catalog_edits_id_fk"
    FOREIGN KEY ("edit_id") REFERENCES "public"."catalog_edits"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "catalog_index_jobs" (
  "id" text PRIMARY KEY NOT NULL,
  "edit_id" text,
  "status" "catalog_index_job_status" DEFAULT 'pending' NOT NULL,
  "payload" jsonb NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "last_error" text,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processing_started_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "catalog_index_jobs_edit_id_catalog_edits_id_fk"
    FOREIGN KEY ("edit_id") REFERENCES "public"."catalog_edits"("id") ON DELETE set null ON UPDATE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_titles_legacy_film_idx"
  ON "catalog_titles" USING btree ("legacy_film_id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_titles_slug_idx"
  ON "catalog_titles" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "catalog_titles_type_year_idx"
  ON "catalog_titles" USING btree ("type", "start_year", "id");
CREATE INDEX IF NOT EXISTS "catalog_titles_parent_episode_idx"
  ON "catalog_titles" USING btree ("parent_title_id", "season_number", "episode_number", "id");
CREATE INDEX IF NOT EXISTS "catalog_titles_sort_title_idx"
  ON "catalog_titles" USING btree ("sort_title", "start_year", "id");
CREATE INDEX IF NOT EXISTS "catalog_titles_updated_at_idx"
  ON "catalog_titles" USING btree ("updated_at", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_people_slug_idx"
  ON "catalog_people" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "catalog_people_sort_name_idx"
  ON "catalog_people" USING btree ("sort_name", "id");
CREATE INDEX IF NOT EXISTS "catalog_people_updated_at_idx"
  ON "catalog_people" USING btree ("updated_at", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_companies_slug_idx"
  ON "catalog_companies" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "catalog_companies_type_sort_idx"
  ON "catalog_companies" USING btree ("type", "sort_name", "id");
CREATE INDEX IF NOT EXISTS "catalog_companies_updated_at_idx"
  ON "catalog_companies" USING btree ("updated_at", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_title_relations_unique_idx"
  ON "catalog_title_relations" USING btree ("from_title_id", "to_title_id", "type");
CREATE INDEX IF NOT EXISTS "catalog_title_relations_from_type_idx"
  ON "catalog_title_relations" USING btree ("from_title_id", "type", "sort_order");
CREATE INDEX IF NOT EXISTS "catalog_title_relations_to_type_idx"
  ON "catalog_title_relations" USING btree ("to_title_id", "type", "sort_order");

CREATE INDEX IF NOT EXISTS "catalog_credits_title_department_idx"
  ON "catalog_credits" USING btree ("title_id", "department", "billing_order", "id");
CREATE INDEX IF NOT EXISTS "catalog_credits_person_title_idx"
  ON "catalog_credits" USING btree ("person_id", "title_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_credits_dedupe_idx"
  ON "catalog_credits" USING btree ("title_id", "person_id", "department", "job", (COALESCE("character_name", '')));
CREATE INDEX IF NOT EXISTS "catalog_credits_updated_at_idx"
  ON "catalog_credits" USING btree ("updated_at", "id");

CREATE INDEX IF NOT EXISTS "catalog_title_companies_title_role_idx"
  ON "catalog_title_companies" USING btree ("title_id", "role", "sort_order");
CREATE INDEX IF NOT EXISTS "catalog_title_companies_company_role_idx"
  ON "catalog_title_companies" USING btree ("company_id", "role", "title_id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_title_companies_dedupe_idx"
  ON "catalog_title_companies" USING btree ("title_id", "company_id", "role", "region");

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_awards_slug_idx"
  ON "catalog_awards" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "catalog_awards_name_idx"
  ON "catalog_awards" USING btree ("name", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_genres_slug_idx"
  ON "catalog_genres" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "catalog_genres_active_sort_idx"
  ON "catalog_genres" USING btree ("is_active", "sort_order", "name", "id");
CREATE INDEX IF NOT EXISTS "catalog_genres_parent_idx"
  ON "catalog_genres" USING btree ("parent_genre_id", "sort_order", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_title_genres_title_genre_idx"
  ON "catalog_title_genres" USING btree ("title_id", "genre_id");
CREATE INDEX IF NOT EXISTS "catalog_title_genres_genre_title_idx"
  ON "catalog_title_genres" USING btree ("genre_id", "title_id");
CREATE INDEX IF NOT EXISTS "catalog_title_genres_title_sort_idx"
  ON "catalog_title_genres" USING btree ("title_id", "sort_order", "genre_id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_award_events_award_year_idx"
  ON "catalog_award_events" USING btree ("award_id", "year");
CREATE INDEX IF NOT EXISTS "catalog_award_events_year_idx"
  ON "catalog_award_events" USING btree ("year", "id");
CREATE INDEX IF NOT EXISTS "catalog_award_nominations_event_category_idx"
  ON "catalog_award_nominations" USING btree ("event_id", "category_name", "sort_order");
CREATE INDEX IF NOT EXISTS "catalog_award_nominations_title_idx"
  ON "catalog_award_nominations" USING btree ("title_id", "event_id");
CREATE INDEX IF NOT EXISTS "catalog_award_nominations_person_idx"
  ON "catalog_award_nominations" USING btree ("person_id", "event_id");
CREATE INDEX IF NOT EXISTS "catalog_award_nominations_company_idx"
  ON "catalog_award_nominations" USING btree ("company_id", "event_id");

CREATE INDEX IF NOT EXISTS "catalog_media_assets_entity_type_idx"
  ON "catalog_media_assets" USING btree ("entity_type", "entity_id", "type", "sort_order");
CREATE INDEX IF NOT EXISTS "catalog_media_assets_primary_idx"
  ON "catalog_media_assets" USING btree ("entity_type", "entity_id", "is_primary");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_media_assets_one_primary_idx"
  ON "catalog_media_assets" USING btree ("entity_type", "entity_id", "type") WHERE "is_primary" = true;
CREATE INDEX IF NOT EXISTS "catalog_media_assets_updated_at_idx"
  ON "catalog_media_assets" USING btree ("updated_at", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "catalog_external_ids_entity_provider_idx"
  ON "catalog_external_ids" USING btree ("entity_type", "entity_id", "provider", "external_id");
CREATE INDEX IF NOT EXISTS "catalog_external_ids_provider_external_idx"
  ON "catalog_external_ids" USING btree ("provider", "external_id");
CREATE INDEX IF NOT EXISTS "catalog_external_ids_entity_idx"
  ON "catalog_external_ids" USING btree ("entity_type", "entity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_external_ids_one_primary_idx"
  ON "catalog_external_ids" USING btree ("entity_type", "entity_id", "provider") WHERE "is_primary" = true;

CREATE INDEX IF NOT EXISTS "catalog_aliases_entity_type_idx"
  ON "catalog_aliases" USING btree ("entity_type", "entity_id", "type");
CREATE INDEX IF NOT EXISTS "catalog_aliases_sort_value_idx"
  ON "catalog_aliases" USING btree ("sort_value", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_aliases_dedupe_idx"
  ON "catalog_aliases" USING btree ("entity_type", "entity_id", "type", "value", "language", "region");

CREATE INDEX IF NOT EXISTS "catalog_edits_actor_created_idx"
  ON "catalog_edits" USING btree ("actor_user_id", "created_at", "id");
CREATE INDEX IF NOT EXISTS "catalog_edits_status_created_idx"
  ON "catalog_edits" USING btree ("status", "created_at", "id");
CREATE INDEX IF NOT EXISTS "catalog_edits_pending_review_idx"
  ON "catalog_edits" USING btree ("status", "created_at", "id") WHERE "status" = 'pending_review';
CREATE INDEX IF NOT EXISTS "catalog_edits_source_created_idx"
  ON "catalog_edits" USING btree ("source", "created_at", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "catalog_edits_actor_idempotency_idx"
  ON "catalog_edits" USING btree ("actor_user_id", "idempotency_key");

CREATE INDEX IF NOT EXISTS "catalog_sources_edit_idx"
  ON "catalog_sources" USING btree ("edit_id", "id");
CREATE INDEX IF NOT EXISTS "catalog_sources_entity_idx"
  ON "catalog_sources" USING btree ("entity_type", "entity_id", "id");
CREATE INDEX IF NOT EXISTS "catalog_sources_url_idx"
  ON "catalog_sources" USING btree ("url");

CREATE INDEX IF NOT EXISTS "catalog_revisions_edit_idx"
  ON "catalog_revisions" USING btree ("edit_id", "id");
CREATE INDEX IF NOT EXISTS "catalog_revisions_entity_created_idx"
  ON "catalog_revisions" USING btree ("entity_type", "entity_id", "created_at", "id");
CREATE INDEX IF NOT EXISTS "catalog_revisions_action_created_idx"
  ON "catalog_revisions" USING btree ("action", "created_at", "id");

CREATE INDEX IF NOT EXISTS "catalog_index_jobs_unprocessed_idx"
  ON "catalog_index_jobs" USING btree ("created_at", "id") WHERE "processed_at" IS NULL;
CREATE INDEX IF NOT EXISTS "catalog_index_jobs_status_available_idx"
  ON "catalog_index_jobs" USING btree ("status", "available_at", "id");
CREATE INDEX IF NOT EXISTS "catalog_index_jobs_edit_idx"
  ON "catalog_index_jobs" USING btree ("edit_id", "id");
