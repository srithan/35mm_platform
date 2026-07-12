import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export var accountStatusEnum = pgEnum("account_status", [
  "active",
  "deactivated",
  "suspended",
  "banned",
]);

export type NotificationEmailPreferenceKey =
  | "like"
  | "repost"
  | "follow"
  | "follow_request"
  | "follow_request_approved"
  | "comment"
  | "reply"
  | "mention"
  | "film_logged"
  | "report_status_update"
  | "content_moderated"
  | "content_under_review";

export type NotificationEmailPreferenceValue = {
  enabled: boolean;
  lastSentAt?: string | null;
};

export type NotificationEmailPreferences = Partial<
  Record<NotificationEmailPreferenceKey, NotificationEmailPreferenceValue>
>;

export var users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  notificationEmailPreferences: jsonb("notification_email_preferences")
    .$type<NotificationEmailPreferences>()
    .default(sql`'{
      "like": { "enabled": false },
      "repost": { "enabled": false },
      "follow": { "enabled": true },
      "follow_request": { "enabled": true },
      "follow_request_approved": { "enabled": true },
      "comment": { "enabled": true },
      "reply": { "enabled": true },
      "mention": { "enabled": true },
      "film_logged": { "enabled": false },
      "report_status_update": { "enabled": true },
      "content_moderated": { "enabled": true },
      "content_under_review": { "enabled": true }
    }'::jsonb`)
    .notNull(),
  ageVerifiedAt: timestamp("age_verified_at", { withTimezone: true }).notNull(),
  status: accountStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
