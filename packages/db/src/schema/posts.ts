import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
  integer,
  smallint,
  type AnyPgColumn,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { films } from "./films.js";

export var postTypeEnum = pgEnum("post_type", [
  "text",
  "discussion",
  "log",
  "review",
  "image",
]);

export var postVisibilityEnum = pgEnum("post_visibility", [
  "public",
  "followers_only",
  "private",
]);

export type PostFilm = {
  id: string;
  tmdbId?: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
};

export type PostMedia = {
  type: "image" | "video" | "film_embed" | "none";
  url: string;
  thumbnailUrl?: string;
  altText?: string;
};

export type LinkPreview = {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
  provider: "youtube" | "vimeo" | "link";
};

export var posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    type: postTypeEnum("type").default("text").notNull(),
    headline: text("headline"),
    body: text("body").notNull(),
    filmId: text("film_id").references(function () {
      return films.id;
    }, { onDelete: "set null" }),
    filmRating: smallint("film_rating"),
    visibility: postVisibilityEnum("visibility").default("public").notNull(),
    replyToId: uuid("reply_to_id").references(function (): AnyPgColumn {
      return posts.id;
    }, { onDelete: "set null" }),
    isRepost: boolean("is_repost").default(false).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    repostCount: integer("repost_count").default(0).notNull(),
    bookmarkCount: integer("bookmark_count").default(0).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    media: jsonb("media").$type<PostMedia[]>().default(sql`'[]'::jsonb`).notNull(),
    mediaUrls: text("media_urls").array().default(sql`'{}'::text[]`).notNull(),
    linkPreview: jsonb("link_preview").$type<LinkPreview>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      userCreatedAtIdx: index("posts_user_created_at_idx").on(table.userId, table.createdAt),
      createdAtIdx: index("posts_created_at_idx").on(table.createdAt),
    };
  }
);

export var postLikes = pgTable(
  "post_likes",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      postUserIdx: uniqueIndex("post_likes_post_user_idx").on(table.postId, table.userId),
    };
  }
);

export var postReposts = pgTable(
  "post_reposts",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      postUserIdx: uniqueIndex("post_reposts_post_user_idx").on(table.postId, table.userId),
    };
  }
);

export var postBookmarks = pgTable(
  "post_bookmarks",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      postUserIdx: uniqueIndex("post_bookmarks_post_user_idx").on(table.postId, table.userId),
    };
  }
);
