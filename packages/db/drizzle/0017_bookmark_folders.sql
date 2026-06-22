CREATE TABLE IF NOT EXISTS "bookmark_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "bookmark_folders" ADD CONSTRAINT "bookmark_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookmark_folders_user_id_idx" ON "bookmark_folders" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD COLUMN IF NOT EXISTS "folder_id" uuid;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_folder_id_bookmark_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."bookmark_folders"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_bookmarks_folder_id_idx" ON "post_bookmarks" USING btree ("folder_id");
