ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "gif_url" text;

ALTER TABLE "comments"
  DROP CONSTRAINT IF EXISTS "comments_gif_url_giphy_chk";

ALTER TABLE "comments"
  ADD CONSTRAINT "comments_gif_url_giphy_chk"
  CHECK (
    "gif_url" IS NULL
    OR (
      char_length("gif_url") <= 2048
      AND "gif_url" ~ '^https://(media[0-9]*|i)\.giphy\.com/'
    )
  );
