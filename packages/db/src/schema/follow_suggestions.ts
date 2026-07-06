import { desc } from "drizzle-orm";
import { pgTable, text, uuid, real, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export var followSuggestions = pgTable(
  "follow_suggestions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
    suggestedUserId: uuid("suggested_user_id")
      .notNull()
      .references(function () {
        return users.id;
      }, { onDelete: "cascade" }),
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
      userScoreIdx: index("fs_user_score_idx").on(
        table.userId,
        desc(table.score),
        table.suggestedUserId
      ),
      uniquePair: uniqueIndex("fs_unique_pair").on(table.userId, table.suggestedUserId),
    };
  }
);
