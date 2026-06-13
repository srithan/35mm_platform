import { Hono } from "hono";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { followSuggestions, follows, profiles, users } from "@35mm/db/schema";
import type { FollowSuggestion } from "@35mm/types";
import { getDb } from "../lib/db.js";
import { getRedisClient } from "../lib/redis.js";
import { requireAuth } from "../lib/middleware.js";
import { enqueueSuggestionRefresh } from "../lib/queues/suggestionQueue.js";

var suggestionsRoutes = new Hono();

var CACHE_PREFIX = "suggestions:fof:";
var CACHE_TTL_SECONDS = 21600;

function sanitizeLimit(value: string | null): number {
  if (!value) return 20;
  var parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20;
  if (parsed <= 0) return 20;
  return Math.min(50, Math.floor(parsed));
}

function decodeCursor(value: string | null): number {
  if (!value) return 0;
  try {
    var parsed = Number.parseInt(
      Buffer.from(value, "base64").toString("utf8"),
      10
    );
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch (error) {
    console.error("[suggestions] failed to decode cursor", { value, error });
    return 0;
  }
}

function encodeCursor(value: number): string {
  return Buffer.from(String(value), "utf8").toString("base64");
}

function ensureSuggestionsKey(userId: string): string {
  return CACHE_PREFIX + userId;
}

function reorderByRequestedIds<T extends { suggestedUserId: string }>(
  rows: T[],
  ids: string[]
): T[] {
  var map = new Map<string, T>();
  for (var i = 0; i < rows.length; i += 1) {
    map.set(rows[i].suggestedUserId, rows[i]);
  }

  return ids
    .map(function (id) {
      return map.get(id) ?? null;
    })
    .filter(function (row): row is T {
      return row !== null;
    });
}

async function readSuggestionRows(userId: string, candidateIds: string[]) {
  if (candidateIds.length === 0) return [];

  var db = getDb();
  return db
    .select({
      suggestedUserId: followSuggestions.suggestedUserId,
      score: followSuggestions.score,
      signalType: followSuggestions.signalType,
    })
    .from(followSuggestions)
    .where(
      and(
        eq(followSuggestions.userId, userId),
        inArray(followSuggestions.suggestedUserId, candidateIds)
      )
    );
}

function asFollowSuggestion(
  row: { userId: string; username: string; displayName: string; avatarUrl: string | null; bio: string | null },
  score: number,
  signalType:
    | "fof"
    | "content_affinity"
    | "letterboxd_import_match"
    | "onboarding_seed"
): FollowSuggestion {
  var people = score === 1 ? "person" : "people";
  return {
    user: {
      id: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      bio: row.bio,
    },
    score,
    signalType,
    signalLabel: "Followed by " + score + " " + people + " you follow",
  };
}

suggestionsRoutes.get("/suggestions/users", requireAuth, async function (c) {
  var user = c.get("user");
  var userId = user?.userId;
  if (!userId) {
    return c.json({ error: "unauthorized" }, 401);
  }

  var limit = sanitizeLimit(c.req.query("limit") ?? null);
  var startIndex = decodeCursor(c.req.query("cursor") ?? null);
    var _context = c.req.query("context");
    void _context;

  var redis = getRedisClient();
  if (!redis) {
    return c.json({ error: "suggestions_unavailable" }, 503);
  }

  try {
    var cacheKey = ensureSuggestionsKey(userId);
    var cached = await redis.get<unknown>(cacheKey);
    var rawCachedIsEmptyArray = Array.isArray(cached) && cached.length === 0;
    if (rawCachedIsEmptyArray) {
      await redis.del(cacheKey);
    }
    var cachedIds = Array.isArray(cached)
      ? cached.filter(function (value): value is string {
          return typeof value === "string" && value.trim().length > 0;
        })
      : [];

    var suggestionRows:
      | {
          suggestedUserId: string;
          score: number;
          signalType:
            | "fof"
            | "content_affinity"
            | "letterboxd_import_match"
            | "onboarding_seed";
        }[]
      | [];

    if (cachedIds.length === 0) {
      var db = getDb();
      var dbRows = await db
        .select({
          suggestedUserId: followSuggestions.suggestedUserId,
          score: followSuggestions.score,
          signalType: followSuggestions.signalType,
        })
        .from(followSuggestions)
        .where(eq(followSuggestions.userId, userId))
        .orderBy(desc(followSuggestions.score))
        .limit(50);

      suggestionRows = dbRows;
      cachedIds = dbRows.map(function (row) {
        return row.suggestedUserId;
      }).filter(function (value) {
        return value !== userId;
      });

      await redis.set(cacheKey, cachedIds);
      await redis.expire(cacheKey, CACHE_TTL_SECONDS);
    } else {
      suggestionRows = await readSuggestionRows(userId, cachedIds);
      suggestionRows = reorderByRequestedIds(suggestionRows, cachedIds);
    }

    if (suggestionRows.length === 0) {
      void enqueueSuggestionRefresh(userId).catch(function (error) {
        console.error("[suggestions] failed to enqueue refresh", { userId, error });
      });
      return c.json({
        suggestions: [],
        nextCursor: null,
        computing: true,
      });
    }

    var filteredRows = suggestionRows.filter(function (row) {
      return row.suggestedUserId !== userId;
    });
    var followedRows = await getDb()
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, userId));
    var followedByViewer = new Set<string>(
      followedRows.map(function (row) {
        return row.followingId;
      })
    );
    filteredRows = filteredRows.filter(function (row) {
      return !followedByViewer.has(row.suggestedUserId);
    });
    var filteredIds = filteredRows.map(function (row) {
      return row.suggestedUserId;
    });
    var suggestionMap = new Map<
      string,
      {
        score: number;
        signalType:
          | "fof"
          | "content_affinity"
          | "letterboxd_import_match"
          | "onboarding_seed";
      }
    >();
    var i = 0;
    for (i = 0; i < filteredRows.length; i += 1) {
      suggestionMap.set(filteredRows[i].suggestedUserId, {
        score: filteredRows[i].score,
        signalType: filteredRows[i].signalType,
      });
    }

    var db = getDb();
    var userRows = await db
      .select({
        userId: users.id,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        bio: profiles.bio,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          eq(users.status, "active"),
          inArray(users.id, filteredIds),
          ne(users.id, userId)
        )
      );

    var userMap = new Map<string, {
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      bio: string | null;
    }>();
    for (i = 0; i < userRows.length; i += 1) {
      var userRow = userRows[i];
      userMap.set(userRow.userId, {
        userId: userRow.userId,
        username: userRow.username,
        displayName: userRow.displayName,
        avatarUrl: userRow.avatarUrl,
        bio: userRow.bio,
      });
    }

    var orderedIds = filteredIds.slice(startIndex, startIndex + limit);
    var suggestions = orderedIds
      .map(function (id) {
        var userProfile = userMap.get(id);
        var signal = suggestionMap.get(id);
        if (!userProfile || !signal) {
          return null;
        }
        return asFollowSuggestion(userProfile, signal.score, signal.signalType);
      })
      .filter(function (value): value is FollowSuggestion {
        return value !== null;
      });

    var nextCursor =
      startIndex + limit >= filteredIds.length
        ? null
        : encodeCursor(startIndex + limit);

    return c.json({
      suggestions: suggestions,
      nextCursor: nextCursor,
      computing: false,
    });
  } catch (error) {
    console.error("[suggestions] failed to load suggestions", { userId, error });
    return c.json({ error: "suggestions_unavailable" }, 503);
  }
});

export { suggestionsRoutes };
