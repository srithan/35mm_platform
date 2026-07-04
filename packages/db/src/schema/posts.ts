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
import { bookmarkFolders } from "./bookmarks.js";
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

export var pollTypeEnum = pgEnum("poll_type", ["ranking", "image"]);

export var pollResultsVisibilityEnum = pgEnum("poll_results_visibility", [
  "after_vote",
  "after_end",
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
  key?: string;
  thumbnailUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
  blurhash?: string;
  variants?: {
    thumb?: string;
    feed?: string;
    full?: string;
  };
};

export type LinkPreview = {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
  provider: "youtube" | "vimeo" | "link";
};

export type PollType = "ranking" | "image";
export type PollResultsVisibility = "after_vote" | "after_end";

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
    folderId: uuid("folder_id").references(function () {
      return bookmarkFolders.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      postUserIdx: uniqueIndex("post_bookmarks_post_user_idx").on(table.postId, table.userId),
      folderIdx: index("post_bookmarks_folder_id_idx").on(table.folderId),
      userCreatedPostIdx: index("post_bookmarks_user_created_post_idx").on(
        table.userId,
        table.createdAt,
        table.postId
      ),
      userFolderCreatedPostIdx: index("post_bookmarks_user_folder_created_post_idx").on(
        table.userId,
        table.folderId,
        table.createdAt,
        table.postId
      ),
    };
  }
);

export var postPolls = pgTable(
  "post_polls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(function () {
        return posts.id;
      }, { onDelete: "cascade" }),
    type: pollTypeEnum("type").notNull(),
    resultsVisibility: pollResultsVisibilityEnum("results_visibility")
      .default("after_vote")
      .notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    totalVotes: integer("total_votes").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      postIdx: uniqueIndex("post_polls_post_idx").on(table.postId),
      endsAtIdx: index("post_polls_ends_at_idx").on(table.endsAt),
    };
  }
);

export var pollOptions = pgTable(
  "poll_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollId: uuid("poll_id")
      .notNull()
      .references(function () {
        return postPolls.id;
      }, { onDelete: "cascade" }),
    label: text("label"),
    imageUrl: text("image_url"),
    position: smallint("position").notNull(),
    voteCount: integer("vote_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      pollPositionIdx: uniqueIndex("poll_options_poll_position_idx").on(table.pollId, table.position),
      pollIdx: index("poll_options_poll_idx").on(table.pollId),
    };
  }
);

export var pollVotes = pgTable(
  "poll_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(function () {
        return posts.id;
      }, { onDelete: "cascade" }),
    pollId: uuid("poll_id")
      .notNull()
      .references(function () {
        return postPolls.id;
      }, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    optionId: uuid("option_id").references(function () {
      return pollOptions.id;
    }, { onDelete: "set null" }),
    rankingOptionIds: uuid("ranking_option_ids").array().default(sql`'{}'::uuid[]`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      postUserIdx: uniqueIndex("poll_votes_post_user_idx").on(table.postId, table.userId),
      pollUserIdx: uniqueIndex("poll_votes_poll_user_idx").on(table.pollId, table.userId),
      pollIdx: index("poll_votes_poll_idx").on(table.pollId),
    };
  }
);
