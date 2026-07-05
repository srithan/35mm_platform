CREATE INDEX "posts_user_type_created_at_idx" ON "posts" USING btree ("user_id","type","created_at","id");--> statement-breakpoint
