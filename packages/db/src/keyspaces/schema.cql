CREATE KEYSPACE IF NOT EXISTS thirtyFiveMM
  WITH replication = {'class': 'SingleRegionStrategy'}
  AND tags = {'env': 'production'};

-- Primary message table.
-- Partitioned by (thread_id, bucket) where bucket is YYYYMM.
-- message_id is a TIMEUUID and is used as cursor.
CREATE TABLE IF NOT EXISTS thirtyFiveMM.messages (
  thread_id      text,
  bucket         int,
  message_id     timeuuid,
  sender_id      text,
  content_type   text,
  body           text,
  media_url      text,
  media_meta     text,
  link_preview   text,
  reply_to_id    timeuuid,
  reply_snapshot text,
  reactions      map<text, frozen<set<text>>>,
  is_deleted     boolean,
  deleted_at     timestamp,
  edited_at      timestamp,
  created_at     timestamp,
  PRIMARY KEY ((thread_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC)
  AND default_time_to_live = 0;

-- Edit history table.
CREATE TABLE IF NOT EXISTS thirtyFiveMM.message_edits (
  thread_id     text,
  message_id    timeuuid,
  edit_id       timeuuid,
  previous_body text,
  edited_at     timestamp,
  PRIMARY KEY ((thread_id, message_id), edit_id)
) WITH CLUSTERING ORDER BY (edit_id DESC);

-- High-scale reaction fact table.
-- Use this instead of growing messages.reactions when reaction write volume gets hot.
-- shard is derived from user_id so add/remove hit the same partition without a lookup.
CREATE TABLE IF NOT EXISTS thirtyFiveMM.message_reactions (
  thread_id  text,
  bucket     int,
  message_id timeuuid,
  emoji      text,
  shard      tinyint,
  user_id    text,
  reacted_at timestamp,
  PRIMARY KEY ((thread_id, bucket, message_id, emoji, shard), user_id)
);
