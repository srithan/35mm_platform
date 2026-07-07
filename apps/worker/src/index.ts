import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import {
  runCounterIncrementJob,
  runCounterOutboxJob,
  type CounterOutboxJobResult,
} from "./jobs/counterIncrement.js";
import { runFeedFanoutJob } from "./jobs/feedFanout.js";
import { runFeedPruneFeedItemsJob } from "./jobs/feedPruneFeedItems.js";
import { runFeedRescoreJob } from "./jobs/feedRescore.js";
import { runListCloneJob } from "./jobs/listClone.js";
import { runProfileFollowApprovalJob } from "./jobs/profileFollowApproval.js";
import { runSuggestionComputeJob } from "./workers/suggestionWorker.js";
import { processPostById, processProfileMediaByPayload, type MediaProcessJobPayload } from "./jobs/mediaProcess.js";
import { runNotificationDigestJob } from "./jobs/notificationDigest.js";
import { runNotificationPublishJob } from "./jobs/notificationPublish.js";
import { runChatDeliverJob } from "./jobs/chatDeliver.js";
import { runChatMessageUpdatedJob } from "./jobs/chatMessageUpdated.js";
import { runChatReadReceiptJob } from "./jobs/chatReadReceipt.js";
import { runChatTypingJob } from "./jobs/chatTyping.js";
import { runCatalogIndexJob, runCatalogIndexOutboxJob } from "./jobs/catalogIndex.js";
import { WORKER_QUEUE_NAME } from "./lib/queue.js";
import { loadWorkerEnv } from "./lib/env.js";
import { warmKeyspacesClient } from "./lib/keyspaces.js";

var outboxQueue: Queue | null = null;

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

async function handleJob(job: Job, queue: Queue): Promise<unknown> {
  if (job.name === "media.process") {
    var payload = job.data as MediaProcessJobPayload;
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid media.process payload");
    }

    if ("postId" in payload) {
      if (typeof payload.postId !== "string" || payload.postId.trim().length === 0) {
        throw new Error("Invalid media.process payload: postId is required");
      }

      var postResult = await processPostById(payload.postId);
      return {
        postId: payload.postId,
        found: postResult.found,
        changed: postResult.changed,
        skipped: postResult.skipped,
      };
    }

    if (
      (payload.kind !== "avatar" && payload.kind !== "cover") ||
      typeof payload.userId !== "string" ||
      payload.userId.trim().length === 0 ||
      typeof payload.objectKey !== "string" ||
      payload.objectKey.trim().length === 0
    ) {
      throw new Error("Invalid media.process payload: profile media fields are required");
    }

    var profileResult = await processProfileMediaByPayload(payload);
    return {
      kind: payload.kind,
      userId: payload.userId,
      objectKey: payload.objectKey,
      changed: profileResult.changed,
      skipped: profileResult.skipped,
      variants: profileResult.variants,
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

  if (job.name === "counter.outbox") {
    var result = (await runCounterOutboxJob(job.data, queue)) as CounterOutboxJobResult;
    if (result.followUp) {
      await enqueueCounterOutboxFollowupJob();
    }
    return result;
  }

  if (job.name === "catalog.index.outbox") {
    return runCatalogIndexOutboxJob(job.data, queue);
  }

  if (job.name === "catalog.index") {
    return runCatalogIndexJob(job.data);
  }

  if (job.name === "notification.publish") {
    await runNotificationPublishJob(job.data as { notificationId: string });
    return { ok: true, stub: true };
  }

  if (job.name === "notification.digest") {
    await runNotificationDigestJob();
    return { ok: true, stub: true };
  }

  if (job.name === "chat.deliver") {
    return runChatDeliverJob(job.data);
  }

  if (job.name === "chat.messageUpdated") {
    return runChatMessageUpdatedJob(job.data);
  }

  if (job.name === "chat.readReceipt") {
    return runChatReadReceiptJob(job.data);
  }

  if (job.name === "chat.typing") {
    return runChatTypingJob(job.data);
  }

  if (job.name === "list.clone") {
    return runListCloneJob(job.data, queue);
  }

  if (job.name === "profile.followApproval") {
    return runProfileFollowApprovalJob(job.data, queue);
  }

  throw new Error("Unknown job: " + job.name);
}

async function main() {
  if ((process.env.WORKER_ENABLED ?? "true").toLowerCase() === "false") {
    console.log("[worker] disabled by WORKER_ENABLED=false");
    return;
  }

  var env = loadWorkerEnv();
  var redisUrl = requiredRedisUrl();
  var connection = connectionFromRedisUrl(redisUrl);
  var schedulerQueue = new Queue(WORKER_QUEUE_NAME, {
    connection,
  });
  outboxQueue = schedulerQueue;

  var worker = new Worker(WORKER_QUEUE_NAME, function (job) {
    return handleJob(job, schedulerQueue);
  }, {
    connection,
    concurrency: Number.isFinite(env.WORKER_CONCURRENCY)
      ? Math.max(1, env.WORKER_CONCURRENCY)
      : 4,
  });

  var queueEvents = new QueueEvents(WORKER_QUEUE_NAME, {
    connection,
  });
  void warmKeyspacesClient()
    .then(function (keyspacesClient) {
      console.log(keyspacesClient ? "[worker] keyspaces warmed" : "[worker] keyspaces disabled");
    })
    .catch(function (error) {
      console.warn("[worker] keyspaces warm failed", error);
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

  await schedulerQueue.add("counter.outbox", {}, {
    jobId: "counter.outbox-repeat",
    repeat: {
      every: 30_000,
    },
    attempts: 6,
    backoff: {
      type: "exponential",
      delay: 1_000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  });

  var catalogIndexIntervalSeconds = Number(process.env.CATALOG_INDEX_OUTBOX_INTERVAL_SECONDS ?? "30");
  await schedulerQueue.add("catalog.index.outbox", {}, {
    jobId: "catalog.index.outbox-repeat",
    repeat: {
      every: Math.max(5, catalogIndexIntervalSeconds) * 1000,
    },
    attempts: 6,
    backoff: {
      type: "exponential",
      delay: 1_000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
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

async function enqueueCounterOutboxFollowupJob(): Promise<void> {
  if (!outboxQueue) return;

  try {
    await outboxQueue.add("counter.outbox", {}, {
      attempts: 6,
      backoff: {
        type: "exponential",
        delay: 1_000,
      },
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  } catch (error) {
    console.warn("[counter.outbox] follow-up enqueue failed", { error });
  }
}

void main().catch(function (error) {
  console.error("[worker] boot failed", error);
  process.exitCode = 1;
});
