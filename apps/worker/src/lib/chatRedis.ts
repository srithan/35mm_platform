import { resolveCacheRedisRestConfig } from "./redisConfig.js";

type UpstashResult<T = unknown> = {
  result?: T;
  error?: string;
};

function configured(): boolean {
  return resolveCacheRedisRestConfig() !== null;
}

async function command<T>(...parts: Array<string | number>): Promise<T | null> {
  var config = resolveCacheRedisRestConfig();
  if (!config) return null;
  var baseUrl = config.baseUrl;
  var path = parts
    .map(function (part) {
      return encodeURIComponent(String(part));
    })
    .join("/");
  var response = await fetch(baseUrl + "/" + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + config.token,
    },
  });
  if (!response.ok) throw new Error("Redis HTTP " + response.status);
  var payload = (await response.json()) as UpstashResult<T>;
  if (payload.error) throw new Error(payload.error);
  return (payload.result ?? null) as T | null;
}

export async function getUnreadCount(userId: string, threadId: string): Promise<number> {
  try {
    var raw = await command<string>("get", `chat:unread:${userId}:${threadId}`);
    if (raw == null) return 0;
    var parsed = Number(JSON.parse(raw));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export async function getUnreadCounts(
  userThreadPairs: Array<{ userId: string; threadId: string }>
): Promise<Record<string, number>> {
  var out: Record<string, number> = {};
  var pairs = userThreadPairs.filter(function (pair) {
    return pair.userId.trim().length > 0 && pair.threadId.trim().length > 0;
  });
  for (var i = 0; i < pairs.length; i += 1) {
    out[pairs[i].userId + ":" + pairs[i].threadId] = 0;
  }
  if (pairs.length === 0) return out;

  try {
    var keys = pairs.map(function (pair) {
      return `chat:unread:${pair.userId}:${pair.threadId}`;
    });
    var values = await command<Array<string | null>>("mget", ...keys);
    if (!Array.isArray(values)) return out;

    for (var j = 0; j < pairs.length; j += 1) {
      var raw = values[j];
      if (raw == null) continue;
      var parsed = Number(JSON.parse(raw));
      out[pairs[j].userId + ":" + pairs[j].threadId] =
        Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
  } catch {
    return out;
  }

  return out;
}
