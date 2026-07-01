import { getRedisClient } from "../../lib/redis.js";
import type { ChatPresenceState } from "@35mm/types";

function unreadKey(userId: string, threadId: string): string {
  return `chat:unread:${userId}:${threadId}`;
}

function typingSetKey(threadId: string): string {
  return `chat:typing-users:${threadId}`;
}

function presenceKey(userId: string): string {
  return `chat:presence:${userId}`;
}

function presenceLastSeenKey(userId: string): string {
  return `chat:presence:last-seen:${userId}`;
}

function activityVisibilityKey(userId: string): string {
  return `chat:presence:activity-visible:${userId}`;
}

export async function incrementUnread(userId: string, threadId: string): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.incr(unreadKey(userId, threadId));
  } catch {
    return;
  }
}

export async function resetUnread(userId: string, threadId: string): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(unreadKey(userId, threadId), 0);
  } catch {
    return;
  }
}

export async function getUnreadCount(userId: string, threadId: string): Promise<number> {
  var redis = getRedisClient();
  if (!redis) return 0;
  try {
    var value = await redis.get<number | string>(unreadKey(userId, threadId));
    var parsed = Number(value ?? 0);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function getUnreadCounts(
  userId: string,
  threadIds: string[]
): Promise<Record<string, number>> {
  var out: Record<string, number> = {};
  var ids = Array.from(new Set(threadIds.filter(Boolean)));
  for (var i = 0; i < ids.length; i += 1) {
    out[ids[i]] = 0;
  }
  var redis = getRedisClient();
  if (!redis || ids.length === 0) return out;

  try {
    var values = await redis.mget<number | string>(ids.map(function (threadId) {
      return unreadKey(userId, threadId);
    }));
    for (var j = 0; j < ids.length; j += 1) {
      var parsed = Number(values[j] ?? 0);
      out[ids[j]] = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
  } catch {
    return out;
  }
  return out;
}

export async function getUnreadCountsForPairs(
  pairs: Array<{ userId: string; threadId: string }>
): Promise<Record<string, number>> {
  var out: Record<string, number> = {};
  var unique = Array.from(
    new Map(
      pairs
        .filter(function (pair) {
          return Boolean(pair.userId && pair.threadId);
        })
        .map(function (pair) {
          return [pair.userId + ":" + pair.threadId, pair] as const;
        })
    ).values()
  );
  unique.forEach(function (pair) {
    out[pair.userId + ":" + pair.threadId] = 0;
  });
  var redis = getRedisClient();
  if (!redis || unique.length === 0) return out;

  try {
    var values = await redis.mget<number | string>(unique.map(function (pair) {
      return unreadKey(pair.userId, pair.threadId);
    }));
    for (var i = 0; i < unique.length; i += 1) {
      var pair = unique[i];
      var parsed = Number(values[i] ?? 0);
      out[pair.userId + ":" + pair.threadId] =
        Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
  } catch {
    return out;
  }
  return out;
}

export async function setTyping(threadId: string, userId: string): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;
  try {
    var expiresAt = Date.now() + 4_000;
    await redis.zadd(typingSetKey(threadId), expiresAt, userId);
    await redis.expire(typingSetKey(threadId), 8);
  } catch {
    return;
  }
}

export async function clearTyping(threadId: string, userId: string): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.zrem(typingSetKey(threadId), userId);
  } catch {
    return;
  }
}

export async function getTypingUsers(threadId: string): Promise<string[]> {
  var redis = getRedisClient();
  if (!redis) return [];
  try {
    var key = typingSetKey(threadId);
    await redis.zremrangebyscore(key, "-inf", Date.now());
    return await redis.zrange(key, 0, -1);
  } catch {
    return [];
  }
}

export async function setPresence(userId: string): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;
  try {
    var now = new Date().toISOString();
    await redis.setex(presenceKey(userId), 65, now);
    await redis.setex(presenceLastSeenKey(userId), 60 * 60 * 24 * 35, now);
  } catch {
    return;
  }
}

export async function getPresence(userIds: string[]): Promise<Record<string, boolean>> {
  var details = await getPresenceStates(userIds);
  var out: Record<string, boolean> = {};
  Object.keys(details).forEach(function (userId) {
    out[userId] = details[userId].status === "online";
  });
  return out;
}

export async function getPresenceStates(
  userIds: string[]
): Promise<Record<string, ChatPresenceState>> {
  var out: Record<string, boolean> = {};
  var redis = getRedisClient();
  for (var i = 0; i < userIds.length; i += 1) {
    var userId = userIds[i];
    if (userId) out[userId] = false;
  }
  var states: Record<string, ChatPresenceState> = {};
  Object.keys(out).forEach(function (userId) {
    states[userId] = {
      userId,
      status: "offline",
      lastSeenAt: null,
    };
  });
  if (!redis) return states;
  var ids = Array.from(new Set(userIds.filter(Boolean)));
  try {
    var onlineValues = await redis.mget<string>(ids.map(presenceKey));
    var lastSeenValues = await redis.mget<string>(ids.map(presenceLastSeenKey));
    for (var j = 0; j < ids.length; j += 1) {
      var onlineAt = onlineValues[j] ?? null;
      var lastSeenAt = onlineAt ?? lastSeenValues[j] ?? null;
      states[ids[j]] = {
        userId: ids[j],
        status: onlineAt != null ? "online" : "offline",
        lastSeenAt,
      };
    }
  } catch {
    return states;
  }
  return states;
}

export async function setActivityVisibilityCache(
  userId: string,
  visible: boolean
): Promise<void> {
  var redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.setex(activityVisibilityKey(userId), 60 * 10, visible ? "1" : "0");
  } catch {
    return;
  }
}

export async function getActivityVisibilityCache(
  userIds: string[]
): Promise<Record<string, boolean | null>> {
  var ids = Array.from(new Set(userIds.filter(Boolean)));
  var out: Record<string, boolean | null> = {};
  ids.forEach(function (userId) {
    out[userId] = null;
  });
  var redis = getRedisClient();
  if (!redis || ids.length === 0) return out;
  try {
    var values = await redis.mget<string>(ids.map(activityVisibilityKey));
    for (var i = 0; i < ids.length; i += 1) {
      if (values[i] === "1") {
        out[ids[i]] = true;
      } else if (values[i] === "0") {
        out[ids[i]] = false;
      }
    }
  } catch {
    return out;
  }
  return out;
}
