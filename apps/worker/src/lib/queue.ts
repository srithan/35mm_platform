import { Queue, type JobsOptions } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { loadWorkerEnv } from "./env.js";

export const WORKER_QUEUE_NAME = "35mm-jobs";

export type MediaProcessJobPayload = {
  postId: string;
};

type SupportedJobName = "media.process" | "feed.fanout" | "counter.increment";

var queue: Queue | null = null;

function connectionFromRedisUrl(redisUrl: string): ConnectionOptions {
  var parsed = new URL(redisUrl);
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

function getRedisUrl(): string {
  var env = loadWorkerEnv();
  var direct = env.UPSTASH_REDIS_URL.trim();
  if (direct) return direct;

  var restUrl = env.UPSTASH_REDIS_REST_URL.trim();
  var restToken = env.UPSTASH_REDIS_REST_TOKEN.trim();
  if (!restUrl || !restToken) {
    throw new Error(
      "Missing Redis queue config. Set UPSTASH_REDIS_URL or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN"
    );
  }
  var parsed = new URL(restUrl);
  return `rediss://default:${encodeURIComponent(restToken)}@${parsed.host}:6379`;
}

function getQueue(): Queue {
  if (queue) return queue;
  var redisUrl = getRedisUrl();
  queue = new Queue(WORKER_QUEUE_NAME, {
    connection: connectionFromRedisUrl(redisUrl),
  });
  return queue;
}

function defaultJobOptions(name: SupportedJobName): JobsOptions {
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
    removeOnComplete: true,
    removeOnFail: 500,
  };
}

export async function enqueueMediaProcessJob(payload: MediaProcessJobPayload): Promise<void> {
  var jobId = "media.process-" + payload.postId;
  await getQueue().add("media.process", payload, {
    ...defaultJobOptions("media.process"),
    jobId,
  });
}

export async function closeWorkerProducerQueue(): Promise<void> {
  await queue?.close();
  queue = null;
}
