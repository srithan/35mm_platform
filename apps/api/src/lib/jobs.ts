import { Queue, type JobsOptions } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { loadEnv } from "./env.js";

export const API_QUEUE_NAME = "35mm-jobs";

type MediaProcessJobPayload = {
  postId: string;
};

type QueueName = "media.process";

var queue: Queue | null | undefined;

function defaultJobOptions(name: QueueName): JobsOptions {
  if (name === "media.process") {
    return {
      attempts: 4,
      backoff: {
        type: "exponential",
        delay: 2_000,
      },
      removeOnComplete: true,
      removeOnFail: 1000,
    };
  }

  return {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1_000,
    },
  };
}

function redisUrl(): string {
  var env = loadEnv();
  var direct = env.UPSTASH_REDIS_URL.trim();
  if (direct) return direct;

  var restUrl = env.UPSTASH_REDIS_REST_URL.trim();
  var restToken = env.UPSTASH_REDIS_REST_TOKEN.trim();
  if (!restUrl || !restToken) return "";

  try {
    var parsed = new URL(restUrl);
    return `rediss://default:${encodeURIComponent(restToken)}@${parsed.host}:6379`;
  } catch (_error) {
    return "";
  }
}

function connectionFromRedisUrl(url: string): ConnectionOptions {
  var parsed = new URL(url);
  var isTls = parsed.protocol === "rediss:";
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : isTls ? 6379 : 6379,
    username: decodeURIComponent(parsed.username || "default"),
    password: decodeURIComponent(parsed.password || ""),
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    ...(isTls ? { tls: {} } : {}),
  };
}

function buildQueue(): Queue | null {
  var url = redisUrl();
  if (!url) return null;

  return new Queue(API_QUEUE_NAME, {
    connection: connectionFromRedisUrl(url),
  });
}

function getQueue(): Queue | null {
  if (queue !== undefined) return queue;
  queue = buildQueue();
  return queue;
}

export function isQueueEnabled(): boolean {
  return getQueue() !== null;
}

export async function enqueueMediaProcessJob(payload: MediaProcessJobPayload): Promise<boolean> {
  var q = getQueue();
  if (!q) return false;

  await q.add("media.process", payload, {
    ...defaultJobOptions("media.process"),
    jobId: "media.process-" + payload.postId,
  });

  return true;
}

export async function closeApiQueue(): Promise<void> {
  await queue?.close();
  queue = undefined;
}
