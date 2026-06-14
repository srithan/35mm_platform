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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { films } from "./films.js";

export var filmListTypeEnum = pgEnum("film_list_type", ["custom", "watchlist"]);
export var filmListVisibilityEnum = pgEnum("film_list_visibility", ["public", "private"]);

export var filmLists = pgTable(
  "film_lists",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    type: filmListTypeEnum("type").default("custom").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    visibility: filmListVisibilityEnum("visibility").default("public").notNull(),
    isRanked: boolean("is_ranked").default(false).notNull(),
    tags: text("tags").array().default(sql`'{}'::text[]`).notNull(),
    shareSlug: text("share_slug").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    entryCount: integer("entry_count").default(0).notNull(),
    clonedFromListId: text("cloned_from_list_id").references(function (): AnyPgColumn {
      return filmLists.id;
    }, { onDelete: "set null" }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      userUpdatedAtIdx: index("film_lists_user_updated_at_idx").on(table.userId, table.updatedAt),
      publicUpdatedAtIdx: index("film_lists_public_updated_at_idx").on(table.visibility, table.updatedAt),
      shareSlugIdx: uniqueIndex("film_lists_share_slug_idx").on(table.shareSlug),
      oneWatchlistPerUserIdx: uniqueIndex("film_lists_one_watchlist_per_user_idx")
        .on(table.userId)
        .where(sql`${table.type} = 'watchlist' and ${table.isDeleted} = false`),
    };
  }
);

export var filmListEntries = pgTable(
  "film_list_entries",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(function () {
        return filmLists.id;
      }, { onDelete: "cascade" }),
    filmId: text("film_id")
      .notNull()
      .references(function () {
        return films.id;
      }, { onDelete: "cascade" }),
    position: integer("position"),
    note: text("note"),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      listPositionIdx: index("film_list_entries_list_position_idx").on(table.listId, table.position),
      filmListIdx: index("film_list_entries_film_list_idx").on(table.filmId, table.listId),
      listFilmUniqueIdx: uniqueIndex("film_list_entries_list_film_idx").on(table.listId, table.filmId),
    };
  }
);

export var filmListLikes = pgTable(
  "film_list_likes",
  {
    listId: text("list_id")
      .notNull()
      .references(function () {
        return filmLists.id;
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
      listUserIdx: uniqueIndex("film_list_likes_list_user_idx").on(table.listId, table.userId),
    };
  }
);
