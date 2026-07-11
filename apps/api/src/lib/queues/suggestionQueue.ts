import { Queue, type JobsOptions } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { resolveQueueRedisUrl } from "../redisConfig.js";

const WORKER_QUEUE_NAME = "35mm-jobs";
const SUGGESTION_JOB_NAME = "compute-suggestions" as const;

export type SuggestionRefreshPayload = {
  userId: string;
};

var globalForSuggestionQueue = globalThis as typeof globalThis & {
  __thirtyFiveMmSuggestionQueue?: Queue | null;
};

var suggestionQueue: Queue | null = globalForSuggestionQueue.__thirtyFiveMmSuggestionQueue ?? null;

function connectionFromRedisUrl(redisUrl: string): ConnectionOptions {
  var parsed = new URL(redisUrl);
  var isTls = parsed.protocol === "rediss:";
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
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
    throw new Error("Missing Redis queue config. Set QUEUE_REDIS_URL");
  }
  return url;
}

function defaultJobOptions(): JobsOptions {
  return {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 500,
  };
}

function getQueue() {
  if (suggestionQueue) return suggestionQueue;

  var redisUrl = getRedisUrl();
  suggestionQueue = new Queue(WORKER_QUEUE_NAME, {
    connection: connectionFromRedisUrl(redisUrl),
  });
  globalForSuggestionQueue.__thirtyFiveMmSuggestionQueue = suggestionQueue;
  return suggestionQueue;
}

export async function enqueueSuggestionRefresh(userId: string): Promise<void> {
  var trimmedUserId = userId.trim();
  if (!trimmedUserId) return;

  await getQueue().add(SUGGESTION_JOB_NAME, { userId: trimmedUserId } as SuggestionRefreshPayload, {
    ...defaultJobOptions(),
    jobId: "compute-suggestions-" + trimmedUserId,
  });
}
