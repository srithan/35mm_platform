SET lock_timeout = '5s';
SET statement_timeout = '5min';

ALTER TABLE "posts" VALIDATE CONSTRAINT "posts_watch_details_check";
