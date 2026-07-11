import {
  resolveCacheRedisRestConfig,
  resolveRateLimitRedisRestConfig,
  type RedisRestConfig,
} from "./redisConfig.js";

type UpstashResult<T = unknown> = {
  result?: T;
  error?: string;
};

export type RedisClient = {
  get<T>(key: string): Promise<T | null>;
  mget<T>(keys: string[]): Promise<Array<T | null>>;
  set(key: string, value: unknown): Promise<void>;
  setex(key: string, seconds: number, value: unknown): Promise<void>;
  incr(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<void>;
  smembers<T = string>(key: string): Promise<T[]>;
  keys(pattern: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<void>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrem(key: string, member: string): Promise<void>;
  zremrangebyscore(key: string, min: number | string, max: number | string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
};

var globalForRedis = globalThis as typeof globalThis & {
  __thirtyFiveMmRedisClient?: RedisClient | null;
  __thirtyFiveMmRedisConfigKey?: string;
  __thirtyFiveMmRateLimitRedisClient?: RedisClient | null;
  __thirtyFiveMmRateLimitRedisConfigKey?: string;
};

var redisClient: RedisClient | null | undefined = globalForRedis.__thirtyFiveMmRedisClient;
var redisConfigKey: string | undefined = globalForRedis.__thirtyFiveMmRedisConfigKey;
var rateLimitRedisClient: RedisClient | null | undefined =
  globalForRedis.__thirtyFiveMmRateLimitRedisClient;
var rateLimitRedisConfigKey: string | undefined =
  globalForRedis.__thirtyFiveMmRateLimitRedisConfigKey;

function configKey(config: RedisRestConfig | null): string {
  if (!config) return "";
  return config.baseUrl + "|" + config.token;
}

function buildClient(config: RedisRestConfig): RedisClient {
  var baseUrl = config.baseUrl;
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

    var payload = (await response.json()) as UpstashResult<T>;
    if (payload.error) {
      throw new Error(payload.error);
    }

    return (payload.result ?? null) as T | null;
  }

  function parseValue<T>(raw: unknown): T | null {
    if (raw == null) return null;
    if (typeof raw !== "string") return raw as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  return {
    async get<T>(key: string) {
      var raw = await command<string>("get", key);
      return parseValue<T>(raw);
    },
    async mget<T>(keys: string[]) {
      if (keys.length === 0) return [];
      var values = await command<unknown[]>("mget", ...keys);
      if (!Array.isArray(values)) return keys.map(function () { return null; });
      return values.map(function (value) {
        return parseValue<T>(value);
      });
    },
    async set(key: string, value: unknown) {
      var serialized = JSON.stringify(value);
      await command("set", key, serialized);
    },
    async setex(key: string, seconds: number, value: unknown) {
      var serialized = JSON.stringify(value);
      await command("setex", key, seconds, serialized);
    },
    async incr(key: string) {
      var value = await command<number>("incr", key);
      return typeof value === "number" && Number.isFinite(value) ? value : 0;
    },
    async sadd(key: string, ...members: string[]) {
      if (members.length === 0) return;
      await command("sadd", key, ...members);
    },
    async smembers<T = string>(key: string) {
      var values = await command<T[]>("smembers", key);
      return Array.isArray(values) ? values : [];
    },
    async keys(pattern: string) {
      var values = await command<string[]>("keys", pattern);
      return Array.isArray(values) ? values : [];
    },
    async expire(key: string, seconds: number) {
      await command("expire", key, seconds);
    },
    async ttl(key: string) {
      var value = await command<number>("ttl", key);
      return typeof value === "number" && Number.isFinite(value) ? value : -1;
    },
    async del(...keys: string[]) {
      if (keys.length === 0) return;
      await command("del", ...keys);
    },
    async zadd(key: string, score: number, member: string) {
      await command("zadd", key, score, member);
    },
    async zrem(key: string, member: string) {
      await command("zrem", key, member);
    },
    async zremrangebyscore(key: string, min: number | string, max: number | string) {
      var value = await command<number>("zremrangebyscore", key, min, max);
      return typeof value === "number" && Number.isFinite(value) ? value : 0;
    },
    async zrange(key: string, start: number, stop: number) {
      var values = await command<string[]>("zrange", key, start, stop);
      return Array.isArray(values) ? values : [];
    },
  };
}

export function getRedisClient(): RedisClient | null {
  var config = resolveCacheRedisRestConfig();
  var nextConfigKey = configKey(config);
  if (redisClient !== undefined && redisConfigKey === nextConfigKey) return redisClient;
  redisConfigKey = nextConfigKey;
  globalForRedis.__thirtyFiveMmRedisConfigKey = redisConfigKey;
  if (!config) {
    redisClient = null;
    globalForRedis.__thirtyFiveMmRedisClient = redisClient;
    return redisClient;
  }

  redisClient = buildClient(config);
  globalForRedis.__thirtyFiveMmRedisClient = redisClient;
  return redisClient;
}

export function getRateLimitRedisClient(): RedisClient | null {
  var config = resolveRateLimitRedisRestConfig();
  var nextConfigKey = configKey(config);
  if (
    rateLimitRedisClient !== undefined &&
    rateLimitRedisConfigKey === nextConfigKey
  ) return rateLimitRedisClient;

  rateLimitRedisConfigKey = nextConfigKey;
  globalForRedis.__thirtyFiveMmRateLimitRedisConfigKey = rateLimitRedisConfigKey;
  if (!config) {
    rateLimitRedisClient = null;
    globalForRedis.__thirtyFiveMmRateLimitRedisClient = rateLimitRedisClient;
    return rateLimitRedisClient;
  }

  rateLimitRedisClient = buildClient(config);
  globalForRedis.__thirtyFiveMmRateLimitRedisClient = rateLimitRedisClient;
  return rateLimitRedisClient;
}

export function isRedisEnabled(): boolean {
  return getRedisClient() !== null;
}
