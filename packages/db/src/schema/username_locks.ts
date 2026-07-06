import { pgTable, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export var usernameLockStateEnum = ["locked", "reserved"] as const;
export type UsernameLockState = (typeof usernameLockStateEnum)[number];

export var usernameLocks = pgTable(
  "username_locks",
  {
    username: text("username").primaryKey().notNull(),
    state: text("state").default("locked").notNull(),
    owner: text("owner").default("studio").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  function (table) {
    return {
      usernameLowerCheck: check("username_locks_username_lower_chk", sql`${table.username} = lower(${table.username})`),
      stateCheck: check("username_locks_state_chk", sql`${table.state} in ('locked', 'reserved')`),
    };
  }
);
