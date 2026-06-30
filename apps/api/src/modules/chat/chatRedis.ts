import { getRedisClient } from "../../lib/redis.js";

function unreadKey(userId: string, threadId: string): string {
  return `chat:unread:${userId}:${threadId}`;
}

function typingSetKey(threadId: string): string {
  return `chat:typing-users:${threadId}`;
}

function presenceKey(userId: string): string {
  return `chat:presence:${userId}`;
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
    await redis.setex(presenceKey(userId), 65, new Date().toISOString());
  } catch {
    return;
  }
}

export async function getPresence(userIds: string[]): Promise<Record<string, boolean>> {
  var out: Record<string, boolean> = {};
  var redis = getRedisClient();
  for (var i = 0; i < userIds.length; i += 1) {
    var userId = userIds[i];
    if (userId) out[userId] = false;
  }
  if (!redis) return out;
  var ids = Array.from(new Set(userIds.filter(Boolean)));
  try {
    var values = await redis.mget<string>(ids.map(presenceKey));
    for (var j = 0; j < ids.length; j += 1) {
      out[ids[j]] = values[j] != null;
    }
  } catch {
    return out;
  }
  return out;
}
