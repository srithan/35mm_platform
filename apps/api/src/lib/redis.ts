import { loadEnv } from "./env.js";

type UpstashResult<T = unknown> = {
  result?: T;
  error?: string;
};

export type RedisClient = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  incr(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<void>;
  smembers<T = string>(key: string): Promise<T[]>;
  expire(key: string, seconds: number): Promise<void>;
  ttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<void>;
};

var redisClient: RedisClient | null | undefined;

function configured(): boolean {
  var env = loadEnv();
  return (
    env.UPSTASH_REDIS_REST_URL.trim().length > 0 &&
    env.UPSTASH_REDIS_REST_TOKEN.trim().length > 0
  );
}

function buildClient(): RedisClient {
  var env = loadEnv();
  var baseUrl = env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, "");
  var token = env.UPSTASH_REDIS_REST_TOKEN;

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

  return {
    async get<T>(key: string) {
      var raw = await command<string>("get", key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },
    async set(key: string, value: unknown) {
      var serialized = JSON.stringify(value);
      await command("set", key, serialized);
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
  };
}

export function getRedisClient(): RedisClient | null {
  if (redisClient !== undefined) return redisClient;
  if (!configured()) {
    redisClient = null;
    return redisClient;
  }

  redisClient = buildClient();
  return redisClient;
}

export function isRedisEnabled(): boolean {
  return getRedisClient() !== null;
}
