import { pgTable, text, real, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

export var followSuggestions = pgTable(
  "follow_suggestions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    suggestedUserId: text("suggested_user_id").notNull(),
    score: real("score").notNull().default(0),
    signalType: text("signal_type", {
      enum: [
        "fof",
        "content_affinity",
        "letterboxd_import_match",
        "onboarding_seed",
      ],
    }).notNull().default("fof"),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  function (table) {
    return {
      userIdx: index("fs_user_idx").on(table.userId),
      uniquePair: uniqueIndex("fs_unique_pair").on(table.userId, table.suggestedUserId),
    };
  }
);
