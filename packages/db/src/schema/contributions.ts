import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export var contributionKindEnum = pgEnum("contribution_kind", [
  "add_title",
  "edit_title",
  "credits",
  "person_update",
  "media",
  "awards_events",
  "duplicate_titles",
  "merge_people",
  "split_person",
]);

export var contributionStatusEnum = pgEnum("contribution_status", [
  "pending",
  "in_review",
  "approved",
  "rejected",
]);

export type ContributionPayload = Record<string, unknown>;

export var contributionSubmissions = pgTable(
  "contribution_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    kind: contributionKindEnum("kind").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    payload: jsonb("payload").$type<ContributionPayload>().notNull(),
    status: contributionStatusEnum("status").default("pending").notNull(),
    reviewerUserId: uuid("reviewer_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    reviewNote: text("review_note"),
    idempotencyKey: text("idempotency_key").notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  function (table) {
    return {
      userCreatedAtIdx: index("contribution_submissions_user_created_id_idx").on(
        table.userId,
        table.createdAt,
        table.id
      ),
      statusCreatedAtIdx: index("contribution_submissions_status_created_id_idx").on(
        table.status,
        table.createdAt,
        table.id
      ),
      entityIdx: index("contribution_submissions_entity_idx").on(table.entityType, table.entityId),
      userIdempotencyIdx: uniqueIndex("contribution_submissions_user_idempotency_idx").on(
        table.userId,
        table.idempotencyKey
      ),
    };
  }
);
