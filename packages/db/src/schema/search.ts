import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type SearchIndexEntityType = "film" | "profile" | "post";
export type SearchIndexJobStatus = "pending" | "processing" | "processed" | "failed";

export var searchIndexJobs = pgTable(
  "search_index_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").$type<SearchIndexEntityType>().notNull(),
    entityId: text("entity_id").notNull(),
    status: text("status").$type<SearchIndexJobStatus>().default("pending").notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    processingStartedAt: timestamp("processing_started_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").default(0).notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      unprocessedIdx: index("search_index_jobs_unprocessed_idx")
        .on(table.createdAt, table.id)
        .where(sql`${table.processedAt} is null`),
      statusAvailableIdx: index("search_index_jobs_status_available_idx").on(
        table.status,
        table.availableAt,
        table.id
      ),
      entityIdx: index("search_index_jobs_entity_idx").on(
        table.entityType,
        table.entityId,
        table.createdAt
      ),
      entityTypeCheck: check(
        "search_index_jobs_entity_type_chk",
        sql`${table.entityType} in ('film', 'profile', 'post')`
      ),
      statusCheck: check(
        "search_index_jobs_status_chk",
        sql`${table.status} in ('pending', 'processing', 'processed', 'failed')`
      ),
    };
  }
);
