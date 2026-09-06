import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  jsonb,
  boolean,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { posts } from "./posts.js";
import { films } from "./films.js";

export type FilmUploadDetails = {
  title: string;
  description: string;
  tagline: string;
  director: string;
  year: number | null;
  language: string;
  country: string;
  genres: string[];
  contentRating: string;
  tags: string[];
  festivalNotes: string;
  thumbnailUrl: string | null;
};

export const videoAssets = pgTable(
  "video_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    purpose: text("purpose").$type<"post" | "film">().notNull(),
    libraryId: text("library_id").notNull(),
    providerId: uuid("provider_id"),
    stagingProviderId: uuid("staging_provider_id"),
    finalizationStartedAt: timestamp("finalization_started_at", {
      withTimezone: true,
    }),
    state: text("state")
      .$type<"creating" | "uploading" | "processing" | "ready" | "failed">()
      .default("creating")
      .notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    declaredBytes: bigint("declared_bytes", { mode: "number" }).notNull(),
    durationSeconds: integer("duration_seconds"),
    width: integer("width"),
    height: integer("height"),
    failureReason: text("failure_reason"),
    postId: uuid("post_id").references(() => posts.id),
    postRequestHash: text("post_request_hash"),
    filmId: text("film_id").references(() => films.id),
    details: jsonb("details").$type<FilmUploadDetails>(),
    visibility: text("visibility")
      .$type<"public" | "unlisted" | "private">()
      .default("private")
      .notNull(),
    releaseAt: timestamp("release_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    nextCheckAt: timestamp("next_check_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    requestUnique: uniqueIndex("video_assets_user_request_idx").on(
      t.userId,
      t.idempotencyKey,
    ),
    providerUnique: uniqueIndex("video_assets_library_provider_idx").on(
      t.libraryId,
      t.providerId,
    ),
    filmUnique: uniqueIndex("video_assets_film_idx").on(t.filmId),
    postUnique: uniqueIndex("video_assets_post_idx").on(t.postId),
    ownerList: index("video_assets_owner_created_idx").on(
      t.userId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    ownerFilms: index("video_assets_owner_films_idx")
      .on(t.userId, t.releaseAt.desc(), t.id.desc())
      .where(
        sql`${t.purpose} = 'film' and ${t.publishedAt} is not null and ${t.isDeleted} = false and ${t.state} = 'ready'`,
      ),
    publicFilms: index("video_assets_public_films_idx")
      .on(t.releaseAt.desc(), t.id.desc())
      .where(
        sql`${t.purpose} = 'film' and ${t.visibility} = 'public' and ${t.publishedAt} is not null and ${t.isDeleted} = false and ${t.state} = 'ready'`,
      ),
    pending: index("video_assets_pending_idx")
      .on(t.nextCheckAt, t.id)
      .where(
        sql`${t.state} in ('creating', 'uploading', 'processing') and ${t.isDeleted} = false`,
      ),
    stateCheck: check(
      "video_assets_state_check",
      sql`${t.state} in ('creating','uploading','processing','ready','failed')`,
    ),
    purposeCheck: check(
      "video_assets_purpose_check",
      sql`${t.purpose} in ('post','film')`,
    ),
    visibilityCheck: check(
      "video_assets_visibility_check",
      sql`${t.visibility} in ('public','unlisted','private')`,
    ),
    bytesCheck: check(
      "video_assets_bytes_check",
      sql`${t.declaredBytes} > 0 and ${t.declaredBytes} <= 21474836480`,
    ),
  }),
);
