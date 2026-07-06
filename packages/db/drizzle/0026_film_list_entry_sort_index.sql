DROP INDEX IF EXISTS "film_list_entries_list_position_idx";
--> statement-breakpoint
CREATE INDEX "film_list_entries_list_position_idx" ON "film_list_entries" (
  "list_id",
  coalesce("position", -1),
  "added_at",
  "id"
);
