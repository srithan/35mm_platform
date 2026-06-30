import { loadWorkerEnv } from "./env.js";

type UpstashResult<T = unknown> = {
  result?: T;
  error?: string;
};

function configured(): boolean {
  var env = loadWorkerEnv();
  return (
    env.UPSTASH_REDIS_REST_URL.trim().length > 0 &&
    env.UPSTASH_REDIS_REST_TOKEN.trim().length > 0
  );
}

async function command<T>(...parts: Array<string | number>): Promise<T | null> {
  var env = loadWorkerEnv();
  if (!configured()) return null;
  var baseUrl = env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, "");
  var path = parts
    .map(function (part) {
      return encodeURIComponent(String(part));
    })
    .join("/");
  var response = await fetch(baseUrl + "/" + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + env.UPSTASH_REDIS_REST_TOKEN,
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
