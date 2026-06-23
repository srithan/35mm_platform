import { Queue, type JobsOptions } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { loadEnv } from "./env.js";

export const API_QUEUE_NAME = "35mm-jobs";

type MediaProcessJobPayload =
  | {
      postId: string;
    }
  | {
      kind: "avatar" | "cover";
      userId: string;
      objectKey: string;
    };

type NotificationPublishJobPayload = {
  notificationId: string;
  delayMs?: number;
};

type FeedFanoutJobPayload = {
  postId: string;
  authorUserId: string;
};

export type CounterTargetTable =
  | "posts"
  | "comments"
  | "post_polls"
  | "poll_options"
  | "film_lists"
  | "profiles";

export type CounterName =
  | "likeCount"
  | "commentCount"
  | "repostCount"
  | "bookmarkCount"
  | "totalVotes"
  | "voteCount"
  | "entryCount"
  | "filmsLoggedCount";

export type CounterIncrementJobPayload = {
  targetTable: CounterTargetTable;
  targetId: string;
  counterName: CounterName;
  delta: number;
};

type QueueName = "media.process" | "notification.publish" | "counter.increment" | "feed.fanout";

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

  if (name === "counter.increment") {
    return {
      attempts: 8,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: true,
      removeOnFail: 1000,
    };
  }

  if (name === "feed.fanout") {
    return {
      attempts: 8,
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

export async function enqueueNotificationPublishJob(
  payload: NotificationPublishJobPayload
): Promise<boolean> {
  var q = getQueue();
  if (!q) return false;

  try {
    await q.add("notification.publish", payload, {
      ...defaultJobOptions("notification.publish"),
      jobId: "notification.publish-" + payload.notificationId,
      delay: payload.delayMs ?? 0,
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  } catch (error) {
    console.warn("[notification.publish] enqueue failed", error);
    return false;
  }

  return true;
}

export async function removeNotificationPublishJob(notificationId: string): Promise<boolean> {
  var q = getQueue();
  if (!q) return false;

  var jobId = "notification.publish-" + notificationId;

  try {
    await q.remove(jobId);
  } catch (error) {
    console.warn("[notification.publish] remove failed", {
      notificationId,
      error,
    });
    return false;
  }

  return true;
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
  var jobId = "postId" in payload
    ? "media.process-" + payload.postId
    : "media.process-" + payload.kind + "-" + payload.userId + "-" + payload.objectKey;

  await q.add("media.process", payload, {
    ...defaultJobOptions("media.process"),
    jobId,
  });

  return true;
}

export async function enqueueFeedFanoutJob(payload: FeedFanoutJobPayload): Promise<boolean> {
  try {
    var q = getQueue();
    if (!q) {
      console.warn("[feed.fanout] queue disabled", payload);
      return false;
    }

    await q.add("feed.fanout", payload, {
      ...defaultJobOptions("feed.fanout"),
      jobId: "feed.fanout-" + payload.postId,
    });
  } catch (error) {
    console.warn("[feed.fanout] enqueue failed", { payload, error });
    return false;
  }

  return true;
}

export async function enqueueCounterIncrementJob(
  payload: CounterIncrementJobPayload
): Promise<boolean> {
  if (!Number.isInteger(payload.delta) || payload.delta === 0) {
    console.warn("[counter.increment] invalid delta", payload);
    return false;
  }

  var q = getQueue();
  if (!q) {
    console.warn("[counter.increment] queue disabled", payload);
    return false;
  }

  try {
    await q.add("counter.increment", payload, defaultJobOptions("counter.increment"));
  } catch (error) {
    console.warn("[counter.increment] enqueue failed", { payload, error });
    return false;
  }

  return true;
}

export async function closeApiQueue(): Promise<void> {
  await queue?.close();
  queue = undefined;
}
