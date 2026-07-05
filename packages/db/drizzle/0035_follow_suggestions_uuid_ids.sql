DROP INDEX IF EXISTS "fs_user_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "fs_unique_pair";
--> statement-breakpoint
DELETE FROM "follow_suggestions" fs
WHERE fs."user_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR fs."suggested_user_id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR NOT EXISTS (
    SELECT 1
    FROM "users" u
    WHERE u."id" = fs."user_id"::uuid
  )
  OR NOT EXISTS (
    SELECT 1
    FROM "users" u
    WHERE u."id" = fs."suggested_user_id"::uuid
  );
--> statement-breakpoint
ALTER TABLE "follow_suggestions"
  ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid,
  ALTER COLUMN "suggested_user_id" TYPE uuid USING "suggested_user_id"::uuid;
--> statement-breakpoint
ALTER TABLE "follow_suggestions"
  ADD CONSTRAINT "follow_suggestions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "follow_suggestions"
  ADD CONSTRAINT "follow_suggestions_suggested_user_id_users_id_fk"
  FOREIGN KEY ("suggested_user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "fs_user_idx" ON "follow_suggestions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "fs_user_score_idx" ON "follow_suggestions" USING btree ("user_id", "score" DESC, "suggested_user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "fs_unique_pair" ON "follow_suggestions" USING btree ("user_id", "suggested_user_id");
