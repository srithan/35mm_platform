import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { runCounterIncrementJob } from "./jobs/counterIncrement.js";
import { runFeedFanoutJob } from "./jobs/feedFanout.js";
import { runFeedPruneFeedItemsJob } from "./jobs/feedPruneFeedItems.js";
import { runFeedRescoreJob } from "./jobs/feedRescore.js";
import { runSuggestionComputeJob } from "./workers/suggestionWorker.js";
import { processPostById } from "./jobs/mediaProcess.js";
import { runNotificationDigestJob } from "./jobs/notificationDigest.js";
import { runNotificationPublishJob } from "./jobs/notificationPublish.js";
import { WORKER_QUEUE_NAME } from "./lib/queue.js";
import { loadWorkerEnv } from "./lib/env.js";

type MediaProcessJobPayload = {
  postId: string;
};

function requiredRedisUrl(): string {
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

function connectionFromRedisUrl(redisUrl: string): ConnectionOptions {
  var parsed = new URL(redisUrl);
  var isTls = parsed.protocol === "rediss:";
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : isTls ? 6379 : 6379,
    username: decodeURIComponent(parsed.username || "default"),
    password: decodeURIComponent(parsed.password || ""),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(isTls ? { tls: {} } : {}),
  };
}

async function handleJob(job: Job): Promise<unknown> {
  if (job.name === "media.process") {
    var payload = job.data as MediaProcessJobPayload;
    if (!payload || typeof payload.postId !== "string" || payload.postId.trim().length === 0) {
      throw new Error("Invalid media.process payload: postId is required");
    }

    var result = await processPostById(payload.postId);
    return {
      postId: payload.postId,
      found: result.found,
      changed: result.changed,
      skipped: result.skipped,
    };
  }

  if (job.name === "feed.fanout") {
    return runFeedFanoutJob(job.data);
  }

  if (job.name === "feed.rescore") {
    return runFeedRescoreJob(job.data);
  }

  if (job.name === "feed.pruneFeedItems") {
    return runFeedPruneFeedItemsJob(job.data);
  }

  if (job.name === "compute-suggestions") {
    await runSuggestionComputeJob(job.data as { userId: string });
    return { ok: true, stub: true };
  }

  if (job.name === "counter.increment") {
    return runCounterIncrementJob(job.data);
  }

  if (job.name === "notification.publish") {
    await runNotificationPublishJob(job.data as { notificationId: string });
    return { ok: true, stub: true };
  }

  if (job.name === "notification.digest") {
    await runNotificationDigestJob();
    return { ok: true, stub: true };
  }

  throw new Error("Unknown job: " + job.name);
}

async function main() {
  var env = loadWorkerEnv();
  var redisUrl = requiredRedisUrl();
  var connection = connectionFromRedisUrl(redisUrl);
  var schedulerQueue = new Queue(WORKER_QUEUE_NAME, {
    connection,
  });

  var worker = new Worker(WORKER_QUEUE_NAME, handleJob, {
    connection,
    concurrency: Number.isFinite(env.WORKER_CONCURRENCY)
      ? Math.max(1, env.WORKER_CONCURRENCY)
      : 4,
  });

  var queueEvents = new QueueEvents(WORKER_QUEUE_NAME, {
    connection,
  });

  var pruneIntervalMinutes = Number.isFinite(env.FEED_ITEMS_PRUNE_INTERVAL_MINUTES)
    ? Math.max(5, env.FEED_ITEMS_PRUNE_INTERVAL_MINUTES)
    : 60;
  await schedulerQueue.add("feed.pruneFeedItems", {}, {
    jobId: "feed.pruneFeedItems",
    repeat: {
      every: pruneIntervalMinutes * 60 * 1000,
    },
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: true,
    removeOnFail: 500,
  });

  queueEvents.on("completed", function (payload) {
    console.log("[worker] job completed", {
      queue: WORKER_QUEUE_NAME,
      jobId: payload.jobId,
      returnvalue: payload.returnvalue,
    });
  });

  queueEvents.on("failed", function (payload) {
    console.error("[worker] job failed", {
      queue: WORKER_QUEUE_NAME,
      jobId: payload.jobId,
      failedReason: payload.failedReason,
    });
  });

  worker.on("error", function (error) {
    console.error("[worker] runtime error", error);
  });

  console.log("[worker] booted", {
    queue: WORKER_QUEUE_NAME,
    concurrency: Number.isFinite(env.WORKER_CONCURRENCY)
      ? Math.max(1, env.WORKER_CONCURRENCY)
      : 4,
  });

  var shutdown = async function (signal: string) {
    console.log("[worker] shutdown", signal);
    await Promise.allSettled([worker.close(), queueEvents.close(), schedulerQueue.close()]);
    process.exit(0);
  };

  process.on("SIGINT", function () {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", function () {
    void shutdown("SIGTERM");
  });
}

void main().catch(function (error) {
  console.error("[worker] boot failed", error);
  process.exitCode = 1;
});
