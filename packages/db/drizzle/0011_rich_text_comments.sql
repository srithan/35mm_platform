ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_body_max_1000_chk";
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_body_max_20000_chk";
ALTER TABLE "comments" ADD CONSTRAINT "comments_body_max_100000_chk" CHECK (char_length("comments"."body") <= 100000);
