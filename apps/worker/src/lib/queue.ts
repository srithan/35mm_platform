import { Queue, type JobsOptions } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { resolveQueueRedisUrl } from "./redisConfig.js";

export const WORKER_QUEUE_NAME = "35mm-jobs";

export type MediaProcessJobPayload =
  | {
      postId: string;
    }
  | {
      kind: "avatar" | "cover";
      userId: string;
      objectKey: string;
    };

type SupportedJobName =
  | "media.process"
  | "feed.fanout"
  | "feed.rescore"
  | "counter.increment"
  | "counter.outbox"
  | "catalog.index"
  | "catalog.index.outbox"
  | "notification.publish"
  | "notification.digest"
  | "compute-suggestions";

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
  var url = resolveQueueRedisUrl();
  if (!url) {
    throw new Error(
      "Missing Redis queue config. Set QUEUE_REDIS_URL"
    );
  }
  return url;
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
  var jobId = "postId" in payload
    ? "media.process-" + payload.postId
    : "media.process-" + payload.kind + "-" + payload.userId + "-" + payload.objectKey;
  await getQueue().add("media.process", payload, {
    ...defaultJobOptions("media.process"),
    jobId,
  });
}

export async function closeWorkerProducerQueue(): Promise<void> {
  await queue?.close();
  queue = null;
}
