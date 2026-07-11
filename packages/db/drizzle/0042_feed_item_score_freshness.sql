ALTER TABLE "feed_items" ADD COLUMN "score_refreshed_at" timestamp with time zone DEFAULT '1970-01-01 00:00:00+00' NOT NULL;
ALTER TABLE "feed_items" ALTER COLUMN "score_refreshed_at" SET DEFAULT now();
CREATE INDEX "feed_items_score_refreshed_at_id_idx" ON "feed_items" USING btree ("score_refreshed_at","id");
