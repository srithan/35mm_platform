import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

export var moderationContentTypeEnum = pgEnum("moderation_content_type", [
  "post",
  "comment",
  "profile",
]);

export var moderationReportReasonEnum = pgEnum("moderation_report_reason", [
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "nudity_sexual_content",
  "misinformation",
  "self_harm",
  "impersonation",
  "intellectual_property",
  "other",
]);

export var moderationReportStatusEnum = pgEnum("moderation_report_status", [
  "open",
  "reviewing",
  "actioned",
  "dismissed",
]);

export var moderationActorTypeEnum = pgEnum("moderation_actor_type", [
  "staff",
  "system",
]);

export var moderationActionEnum = pgEnum("moderation_action", [
  "no_action",
  "content_hidden",
  "content_removed",
  "content_warning_added",
  "user_warned",
  "user_suspended",
  "user_banned",
  "escalated",
]);

export var moderationContentStatusEnum = pgEnum("moderation_content_status", [
  "visible",
  "hidden",
  "removed",
]);

export type ModerationContentSnapshot = Record<string, unknown>;
export type ModerationActionMetadata = Record<string, unknown>;

export var reports = pgTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterUserId: uuid("reporter_user_id")
      .notNull()
      .references(function () {
        return users.id;
      }),
    contentType: moderationContentTypeEnum("content_type").notNull(),
    contentId: text("content_id").notNull(),
    reason: moderationReportReasonEnum("reason").notNull(),
    details: text("details"),
    contentSnapshot: jsonb("content_snapshot").$type<ModerationContentSnapshot>().notNull(),
    status: moderationReportStatusEnum("status").default("open").notNull(),
    resolvedActionId: text("resolved_action_id").references(function (): AnyPgColumn {
      return moderationActions.id;
    }, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      unresolvedReporterContentIdx: uniqueIndex("reports_unresolved_reporter_content_idx")
        .on(table.reporterUserId, table.contentType, table.contentId)
        .where(sql`${table.status} in ('open', 'reviewing')`),
      contentCreatedAtIdx: index("reports_content_created_at_idx").on(
        table.contentType,
        table.contentId,
        table.createdAt
      ),
      statusCreatedAtIdIdx: index("reports_status_created_at_id_idx").on(
        table.status,
        table.createdAt,
        table.id
      ),
      reporterCreatedAtIdIdx: index("reports_reporter_created_at_id_idx").on(
        table.reporterUserId,
        table.createdAt,
        table.id
      ),
      idUlidCheck: check(
        "reports_id_ulid_chk",
        sql`${table.id} ~ '^[0-9A-HJKMNP-TV-Z]{26}$'`
      ),
      contentIdNotEmptyCheck: check(
        "reports_content_id_not_empty_chk",
        sql`char_length(btrim(${table.contentId})) > 0`
      ),
      detailsMaxLengthCheck: check(
        "reports_details_max_2000_chk",
        sql`${table.details} is null or char_length(${table.details}) <= 2000`
      ),
    };
  }
);

export var moderationActions = pgTable(
  "moderation_actions",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").references(function () {
      return reports.id;
    }, { onDelete: "set null" }),
    contentType: moderationContentTypeEnum("content_type").notNull(),
    contentId: text("content_id").notNull(),
    actorType: moderationActorTypeEnum("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    subjectUserId: uuid("subject_user_id").references(function () {
      return users.id;
    }, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key"),
    action: moderationActionEnum("action").notNull(),
    reason: text("reason").notNull(),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<ModerationActionMetadata>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      contentCreatedAtIdx: index("moderation_actions_content_created_at_idx").on(
        table.contentType,
        table.contentId,
        table.createdAt
      ),
      actorCreatedAtIdx: index("moderation_actions_actor_created_at_idx").on(
        table.actorUserId,
        table.createdAt
      ),
      actorIdempotencyIdx: uniqueIndex("moderation_actions_actor_idempotency_idx").on(
        table.actorUserId,
        table.idempotencyKey
      ),
      subjectCreatedAtIdIdx: index("moderation_actions_subject_created_at_id_idx").on(
        table.subjectUserId,
        table.createdAt,
        table.id
      ),
      idUlidCheck: check(
        "moderation_actions_id_ulid_chk",
        sql`${table.id} ~ '^[0-9A-HJKMNP-TV-Z]{26}$'`
      ),
      contentIdNotEmptyCheck: check(
        "moderation_actions_content_id_not_empty_chk",
        sql`char_length(btrim(${table.contentId})) > 0`
      ),
      idempotencyKeyLengthCheck: check(
        "moderation_actions_idempotency_key_length_chk",
        sql`${table.idempotencyKey} is null or char_length(${table.idempotencyKey}) between 8 and 120`
      ),
    };
  }
);

export var moderationContentState = pgTable(
  "moderation_content_state",
  {
    contentType: moderationContentTypeEnum("content_type").notNull(),
    contentId: text("content_id").notNull(),
    status: moderationContentStatusEnum("status").default("visible").notNull(),
    reportCount: integer("report_count").default(0).notNull(),
    lastReportedAt: timestamp("last_reported_at", { withTimezone: true }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      pk: primaryKey({
        columns: [table.contentType, table.contentId],
        name: "moderation_content_state_content_pk",
      }),
      contentIdNotEmptyCheck: check(
        "moderation_content_state_content_id_not_empty_chk",
        sql`char_length(btrim(${table.contentId})) > 0`
      ),
      reportCountNonnegativeCheck: check(
        "moderation_content_state_report_count_nonnegative_chk",
        sql`${table.reportCount} >= 0`
      ),
      queueIdx: index("moderation_content_state_queue_idx").on(
        table.reportCount.desc(),
        table.lastReportedAt.desc(),
        table.contentType,
        table.contentId
      ),
    };
  }
);

export var moderationNotificationOutbox = pgTable(
  "moderation_notification_outbox",
  {
    id: text("id").primaryKey(),
    actionId: text("action_id")
      .notNull()
      .references(function () {
        return moderationActions.id;
      }, { onDelete: "cascade" }),
    resolution: moderationReportStatusEnum("resolution").notNull(),
    status: text("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    reportCursor: text("report_cursor"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      actionIdx: uniqueIndex("moderation_notification_outbox_action_idx").on(table.actionId),
      unprocessedIdx: index("moderation_notification_outbox_unprocessed_idx")
        .on(table.availableAt, table.id)
        .where(sql`${table.processedAt} is null`),
      idUlidCheck: check(
        "moderation_notification_outbox_id_ulid_chk",
        sql`${table.id} ~ '^[0-9A-HJKMNP-TV-Z]{26}$'`
      ),
      resolutionCheck: check(
        "moderation_notification_outbox_resolution_chk",
        sql`${table.resolution} in ('actioned', 'dismissed')`
      ),
      statusCheck: check(
        "moderation_notification_outbox_status_chk",
        sql`${table.status} in ('pending', 'processing', 'processed', 'failed')`
      ),
      attemptCountNonnegativeCheck: check(
        "moderation_notification_outbox_attempt_count_nonnegative_chk",
        sql`${table.attemptCount} >= 0`
      ),
    };
  }
);
