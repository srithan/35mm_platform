import {
  pgTable,
  uuid,
  boolean,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export var userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(function () {
      return users.id;
    }, { onDelete: "cascade" }),

  privateAccount: boolean("private_account").default(false).notNull(),
  allowMessagesFromAnyone: boolean("allow_messages_from_anyone").default(true).notNull(),
  showActivityStatus: boolean("show_activity_status").default(true).notNull(),

  notifyNewFollowers: boolean("notify_new_followers").default(true).notNull(),
  notifyLikesOnPosts: boolean("notify_likes_on_posts").default(true).notNull(),
  notifyCommentsAndReplies: boolean("notify_comments_and_replies").default(true).notNull(),
  notifyMentions: boolean("notify_mentions").default(true).notNull(),
  notifyFestivalUpdates: boolean("notify_festival_updates").default(true).notNull(),
  notifyWatchlistStreaming: boolean("notify_watchlist_streaming").default(true).notNull(),
  notifyEmailDigest: boolean("notify_email_digest").default(false).notNull(),

  theme: text("theme").default("auto").notNull(),
  accentColor: text("accent_color").default("theme").notNull(),
  videoAutoplay: boolean("video_autoplay").default(true).notNull(),
  videoDefaultQuality: text("video_default_quality").default("auto").notNull(),
  videoAlwaysShowCaptions: boolean("video_always_show_captions").default(false).notNull(),
  videoCaptionStyle: text("video_caption_style").default("default").notNull(),
  videoQuietMode: boolean("video_quiet_mode").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
