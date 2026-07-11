import { loadEnv } from "./env.js";

export type RedisRestConfig = {
  baseUrl: string;
  token: string;
};

function protocolUrlToRestConfig(value: string): RedisRestConfig | null {
  var trimmed = value.trim();
  if (!trimmed) return null;

  try {
    var parsed = new URL(trimmed);
    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") return null;
    var token = decodeURIComponent(parsed.password || "");
    if (!parsed.hostname || !token) return null;
    return {
      baseUrl: "https://" + parsed.hostname,
      token,
    };
  } catch (_error) {
    return null;
  }
}

function explicitRestConfig(url: string, token: string): RedisRestConfig | null {
  var trimmedUrl = url.trim();
  var trimmedToken = token.trim();
  if (!trimmedUrl || !trimmedToken) return null;

  try {
    var parsed = new URL(trimmedUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return {
      baseUrl: trimmedUrl.replace(/\/+$/, ""),
      token: trimmedToken,
    };
  } catch (_error) {
    return null;
  }
}

function protocolUrlFromRestConfig(url: string, token: string): string {
  var parsed = new URL(url);
  return `rediss://default:${encodeURIComponent(token)}@${parsed.host}:6379`;
}

function splitRedisConfigured(): boolean {
  var env = loadEnv();
  return (
    env.RATE_LIMIT_REDIS_URL.trim().length > 0 ||
    env.RATE_LIMIT_REDIS_REST_URL.trim().length > 0 ||
    env.QUEUE_REDIS_URL.trim().length > 0 ||
    env.QUEUE_REDIS_REST_URL.trim().length > 0
  );
}

export function resolveCacheRedisRestConfig(): RedisRestConfig | null {
  var env = loadEnv();
  return (
    protocolUrlToRestConfig(env.UPSTASH_REDIS_URL) ??
    explicitRestConfig(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
  );
}

export function resolveRateLimitRedisRestConfig(): RedisRestConfig | null {
  var env = loadEnv();
  var direct =
    protocolUrlToRestConfig(env.RATE_LIMIT_REDIS_URL) ??
    explicitRestConfig(env.RATE_LIMIT_REDIS_REST_URL, env.RATE_LIMIT_REDIS_REST_TOKEN);
  if (direct) return direct;
  if (splitRedisConfigured()) return null;

  return (
    explicitRestConfig(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN) ??
    protocolUrlToRestConfig(env.UPSTASH_REDIS_URL)
  );
}

export function resolveQueueRedisUrl(): string {
  var env = loadEnv();
  var direct = env.QUEUE_REDIS_URL.trim();
  if (direct) return direct;

  var queueRest = explicitRestConfig(env.QUEUE_REDIS_REST_URL, env.QUEUE_REDIS_REST_TOKEN);
  if (queueRest) return protocolUrlFromRestConfig(queueRest.baseUrl, queueRest.token);

  if (splitRedisConfigured()) return "";

  var legacyDirect = env.UPSTASH_REDIS_URL.trim();
  if (legacyDirect) return legacyDirect;

  var legacyRest = explicitRestConfig(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
  if (legacyRest) return protocolUrlFromRestConfig(legacyRest.baseUrl, legacyRest.token);

  return "";
}
