import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { desc, sql } from "drizzle-orm";
import { users } from "./users.js";

export var chatThreads = pgTable(
  "chat_threads",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    dmMemberLow: uuid("dm_member_low"),
    dmMemberHigh: uuid("dm_member_high"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    dmPairIdx: uniqueIndex("chat_threads_dm_pair_idx")
      .on(table.dmMemberLow, table.dmMemberHigh)
      .where(sql`${table.type} = 'dm'`),
  })
);

export var chatParticipants = pgTable(
  "chat_participants",
  {
    threadId: text("thread_id")
      .notNull()
      .references(function () {
        return chatThreads.id;
      }, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    leftAt: timestamp("left_at", { withTimezone: true }),
    role: text("role").default("member").notNull(),
  },
  function (table) {
    return {
      pk: primaryKey({ columns: [table.threadId, table.userId], name: "chat_participants_thread_user_pk" }),
      userIdx: index("chat_participants_user_idx").on(table.userId, table.joinedAt),
    };
  }
);

export var chatMemberState = pgTable(
  "chat_member_state",
  {
    threadId: text("thread_id")
      .notNull()
      .references(function () {
        return chatThreads.id;
      }, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    lastReadMessageId: text("last_read_message_id"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    mutedUntil: timestamp("muted_until", { withTimezone: true }),
  },
  function (table) {
    return {
      pk: primaryKey({ columns: [table.threadId, table.userId], name: "chat_member_state_thread_user_pk" }),
      userIdx: index("chat_member_state_user_idx").on(table.userId),
      userInboxIdx: index("chat_member_state_user_inbox_idx").on(
        table.userId,
        table.deletedAt,
        desc(table.lastMessageAt),
        table.threadId
      ),
    };
  }
);

export var chatThreadMeta = pgTable(
  "chat_thread_meta",
  {
    threadId: text("thread_id")
      .primaryKey()
      .references(function () {
        return chatThreads.id;
      }, { onDelete: "cascade" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"),
    lastSenderId: uuid("last_sender_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    messageCount: integer("message_count").default(0).notNull(),
  },
  function (table) {
    return {
      lastMessageIdx: index("chat_thread_meta_last_message_idx").on(table.lastMessageAt),
    };
  }
);
