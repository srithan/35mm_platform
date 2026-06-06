import { createDb, follows, followSuggestions } from "@35mm/db";
import { and, count, desc, eq, ne, notInArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ulid } from "ulid";
import { loadWorkerEnv } from "../lib/env.js";
import type { SuggestionRefreshPayload } from "../lib/suggestionQueue.js";

type RedisClient = {
  set(key: string, value: unknown): Promise<void>;
  expire(key: string, seconds: number): Promise<void>;
};

var workerQueueKey = "suggestions:fof:";
var suggestionCacheTtl = 21600;
var db: ReturnType<typeof createDb> | null = null;

function getDb() {
  if (db) return db;
  var env = loadWorkerEnv();
  db = createDb(env.DATABASE_URL);
  return db;
}

function validateUserId(userId: string): string {
  var trimmed = userId.trim();
  if (!trimmed) {
    throw new Error("compute-suggestions job missing userId");
  }
  return trimmed;
}

async function fetchFollowingUserRows(userId: string) {
  return getDb()
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(and(eq(follows.followerId, userId), eq(follows.status, "accepted")));
}

function getSuggestionsKey(userId: string): string {
  return workerQueueKey + userId;
}

function parseRedisConfig(): { url: string; token: string } | null {
  var env = loadWorkerEnv();
  var restUrl = env.UPSTASH_REDIS_REST_URL.trim();
  var token = env.UPSTASH_REDIS_REST_TOKEN.trim();

  if (!restUrl || !token) return null;

  return {
    url: restUrl.replace(/\/+$/, ""),
    token,
  };
}

async function createRedisClient(): Promise<RedisClient | null> {
  var config = parseRedisConfig();
  if (!config) return null;

  var baseUrl = config.url;
  var token = config.token;

  async function command<T>(...parts: Array<string | number>): Promise<T | null> {
    var path = parts
      .map(function (part) {
        return encodeURIComponent(String(part));
      })
      .join("/");
    var response = await fetch(baseUrl + "/" + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!response.ok) {
      throw new Error("Redis HTTP " + response.status);
    }

    var payload = (await response.json()) as {
      result?: T;
      error?: string;
    };

    if (payload.error) {
      throw new Error(payload.error);
    }

    return (payload.result ?? null) as T | null;
  }

  return {
    async set(key: string, value: unknown) {
      await command("set", key, JSON.stringify(value));
    },
    async expire(key: string, seconds: number) {
      await command("expire", key, seconds);
    },
  };
}

export async function runSuggestionComputeJob(payload: SuggestionRefreshPayload): Promise<void> {
  var dbClient = getDb();
  var userId = validateUserId(payload.userId);
  var redis = await createRedisClient();

  var followsAlias = alias(follows, "f1");
  var followsOfFollows = alias(follows, "f2");

  var alreadyFollowing = await fetchFollowingUserRows(userId);
  var alreadyFollowingIds = alreadyFollowing.map(function (row) {
    return row.followingId;
  });
  var scoreField = count();
  var queryConditions = [
    eq(followsAlias.followerId, userId),
    eq(followsAlias.status, "accepted"),
    eq(followsOfFollows.status, "accepted"),
    ne(followsOfFollows.followingId, userId),
  ];
  if (alreadyFollowingIds.length > 0) {
    queryConditions.push(notInArray(followsOfFollows.followingId, alreadyFollowingIds));
  }
  var results = await dbClient
    .select({
      suggestedUserId: followsOfFollows.followingId,
      score: scoreField,
    })
    .from(followsAlias)
    .innerJoin(followsOfFollows, eq(followsAlias.followingId, followsOfFollows.followerId))
    .where(
      and(
        queryConditions[0],
        queryConditions[1],
        queryConditions[2],
        queryConditions[3],
        ...queryConditions.slice(4)
      )
    )
    .groupBy(followsOfFollows.followingId)
    .orderBy(desc(scoreField))
    .limit(50);

  var key = getSuggestionsKey(userId);

  if (results.length === 0) {
    if (redis) {
      await redis.set(key, []);
      await redis.expire(key, suggestionCacheTtl);
    }

    return;
  }

  await dbClient
    .delete(followSuggestions)
    .where(eq(followSuggestions.userId, userId));

  await dbClient.insert(followSuggestions).values(
    results.map(function (row) {
      return {
        id: ulid(),
        userId: userId,
        suggestedUserId: row.suggestedUserId,
        score: Number(row.score),
        signalType: "fof" as const,
        computedAt: new Date(),
      };
    })
  );

  if (redis) {
    var ids = results.map(function (row) {
      return row.suggestedUserId;
    });
    await redis.set(key, ids);
    await redis.expire(key, suggestionCacheTtl);
  }
}
