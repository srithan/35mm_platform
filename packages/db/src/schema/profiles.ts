import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export var profiles = pgTable(
  "profiles",
  {
  id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
    avatarUrl: text("avatar_url"),
    avatarVariants: jsonb("avatar_variants").$type<{ sm?: string; lg?: string }>(),
    coverUrl: text("cover_url"),
    coverVariants: jsonb("cover_variants").$type<{ default?: string }>(),
    location: text("location"),
    website: text("website"),
    dateOfBirth: date("date_of_birth", { mode: "string" }),
    role: text("role"),
    roleContext: text("role_context"),
    isPrivate: boolean("is_private").default(false).notNull(),
    onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    favoriteFilmIds: text("favorite_film_ids").array().default(sql`'{}'::text[]`).notNull(),
    favoriteGenreIds: text("favorite_genre_ids").array().default(sql`'{}'::text[]`).notNull(),
    headline: text("headline"),
    headlineContext: text("headline_context"),
    filmsLoggedCount: integer("films_logged_count").default(0).notNull(),
    unsortedBookmarkCount: integer("unsorted_bookmark_count").default(0).notNull(),
    followerCount: integer("follower_count").default(0).notNull(),
    followingCount: integer("following_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      usernameIdx: uniqueIndex("profiles_username_lower_idx").on(table.username),
      headlineMaxLengthCheck: check(
        "profiles_headline_max_50_chk",
        sql`char_length(${table.headline}) <= 50`
      ),
      headlineContextMaxLengthCheck: check(
        "profiles_headline_context_max_25_chk",
        sql`char_length(${table.headlineContext}) <= 25`
      ),
    };
  }
);
