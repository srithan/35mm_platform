import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
  check,
  doublePrecision,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { posts } from "./posts.js";

export var followStatusEnum = pgEnum("follow_status", [
  "pending",
  "accepted",
]);

export var notificationTypeEnum = pgEnum("notification_type", [
  "like",
  "comment",
  "reply",
  "follow",
  "follow_request",
  "follow_request_approved",
  "mention",
  "repost",
  "film_logged",
]);

export var follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    status: followStatusEnum("status").default("accepted").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      pk: primaryKey({ columns: [table.followerId, table.followingId], name: "follows_follower_following_pk" }),
      followingStatusCursorIdx: index("follows_following_status_created_follower_idx").on(
        table.followingId,
        table.status,
        table.createdAt,
        table.followerId
      ),
    };
  }
);

export var comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(function () {
        return posts.id;
      }, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references(function (): AnyPgColumn {
      return comments.id;
    }, { onDelete: "set null" }),
    body: text("body").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      bodyMaxLengthCheck: check("comments_body_max_100000_chk", sql`char_length(${table.body}) <= 100000`),
      postCreatedAtIdx: index("comments_post_id_created_at_idx").on(table.postId, table.createdAt),
      parentIdIdx: index("comments_parent_id_idx").on(table.parentId),
    };
  }
);

export var commentLikes = pgTable(
  "comment_likes",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(function () {
        return comments.id;
      }, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      commentUserIdx: uniqueIndex("comment_likes_comment_user_idx").on(table.commentId, table.userId),
    };
  }
);

export var notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    actorIds: text("actor_ids").array().default([]).notNull(),
    type: notificationTypeEnum("type").notNull(),
    entityId: text("entity_id"),
    entityType: text("entity_type"),
    isRead: boolean("is_read").default(false).notNull(),
    bundleCount: integer("bundle_count").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      recipientCreatedAtIdx: index("notifications_recipient_id_created_at_idx").on(
        table.recipientId,
        table.createdAt
      ),
      recipientIsReadIdx: index("notifications_recipient_id_is_read_idx").on(table.recipientId, table.isRead),
    };
  }
);

export var feedItems = pgTable(
  "feed_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(function () {
        return posts.id;
      }, { onDelete: "cascade" }),
    score: doublePrecision("score"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      createdAtIdIdx: index("feed_items_created_at_id_idx").on(table.createdAt, table.id),
      userCreatedAtIdx: index("feed_items_user_id_created_at_idx").on(table.userId, table.createdAt),
      userScorePostIdx: index("feed_items_user_score_post_idx").on(table.userId, table.score, table.postId),
      userPostIdx: uniqueIndex("feed_items_user_post_idx").on(table.userId, table.postId),
    };
  }
);

export var postEdits = pgTable(
  "post_edits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(function () {
        return posts.id;
      }, { onDelete: "cascade" }),
    body: text("body").notNull(),
    headline: text("headline"),
    editedAt: timestamp("edited_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export var userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      pk: primaryKey({ columns: [table.blockerId, table.blockedId], name: "user_blocks_blocker_blocked_pk" }),
    };
  }
);

export var userMutes = pgTable(
  "user_mutes",
  {
    muterId: uuid("muter_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    mutedId: uuid("muted_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      pk: primaryKey({ columns: [table.muterId, table.mutedId], name: "user_mutes_muter_muted_pk" }),
    };
  }
);
