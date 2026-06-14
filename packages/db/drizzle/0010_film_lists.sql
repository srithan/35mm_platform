CREATE TYPE "film_list_type" AS ENUM ('custom', 'watchlist');
CREATE TYPE "film_list_visibility" AS ENUM ('public', 'private');

CREATE TABLE "film_lists" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" "film_list_type" DEFAULT 'custom' NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "visibility" "film_list_visibility" DEFAULT 'public' NOT NULL,
  "is_ranked" boolean DEFAULT false NOT NULL,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "share_slug" text NOT NULL,
  "like_count" integer DEFAULT 0 NOT NULL,
  "comment_count" integer DEFAULT 0 NOT NULL,
  "entry_count" integer DEFAULT 0 NOT NULL,
  "cloned_from_list_id" text REFERENCES "film_lists"("id") ON DELETE set null,
  "is_deleted" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "film_list_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "list_id" text NOT NULL REFERENCES "film_lists"("id") ON DELETE cascade,
  "film_id" text NOT NULL REFERENCES "films"("id") ON DELETE cascade,
  "position" integer,
  "note" text,
  "added_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "film_list_likes" (
  "list_id" text NOT NULL REFERENCES "film_lists"("id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "film_lists_user_updated_at_idx" ON "film_lists" ("user_id", "updated_at");
CREATE INDEX "film_lists_public_updated_at_idx" ON "film_lists" ("visibility", "updated_at");
CREATE UNIQUE INDEX "film_lists_share_slug_idx" ON "film_lists" ("share_slug");
CREATE UNIQUE INDEX "film_lists_one_watchlist_per_user_idx" ON "film_lists" ("user_id") WHERE "type" = 'watchlist' AND "is_deleted" = false;
CREATE INDEX "film_list_entries_list_position_idx" ON "film_list_entries" ("list_id", "position");
CREATE INDEX "film_list_entries_film_list_idx" ON "film_list_entries" ("film_id", "list_id");
CREATE UNIQUE INDEX "film_list_entries_list_film_idx" ON "film_list_entries" ("list_id", "film_id");
CREATE UNIQUE INDEX "film_list_likes_list_user_idx" ON "film_list_likes" ("list_id", "user_id");
