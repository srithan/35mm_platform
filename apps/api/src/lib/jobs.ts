import { Queue, type JobsOptions } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { loadEnv } from "./env.js";
import { ApiError, serviceUnavailable } from "./errors.js";

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

type ListCloneJobPayload = {
  sourceListId: string;
  targetListId: string;
  cursor: string | null;
};

type ProfileFollowApprovalJobPayload = {
  targetUserId: string;
  cursor: string | null;
};

type ChatDeliverJobPayload = {
  messageId: string;
  threadId: string;
  senderId: string;
  bucket: number;
};

type ChatMessageUpdatedJobPayload = {
  messageId: string;
  threadId: string;
  bucket: number;
  type: "edit" | "delete" | "reaction";
  reactionRecipientId?: string;
  reactionActorId?: string;
  reactionPreview?: string;
  reactionAt?: string;
};

type ChatReadReceiptJobPayload = {
  threadId: string;
  userId: string;
  lastReadMessageId: string;
};

type ChatTypingJobPayload = {
  threadId: string;
  userId: string;
  isTyping: boolean;
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
  | "filmsLoggedCount"
  | "followerCount"
  | "followingCount";

export type CounterIncrementJobPayload = {
  targetTable: CounterTargetTable;
  targetId: string;
  counterName: CounterName;
  delta: number;
};

type QueueName =
  | "media.process"
  | "notification.publish"
  | "counter.increment"
  | "counter.outbox"
  | "feed.fanout"
  | "list.clone"
  | "profile.followApproval"
  | "chat.deliver"
  | "chat.messageUpdated"
  | "chat.readReceipt"
  | "chat.typing";

export type ChatJobName =
  | "chat.deliver"
  | "chat.messageUpdated"
  | "chat.readReceipt"
  | "chat.typing";

export type ChatJobPayloadByName = {
  "chat.deliver": ChatDeliverJobPayload;
  "chat.messageUpdated": ChatMessageUpdatedJobPayload;
  "chat.readReceipt": ChatReadReceiptJobPayload;
  "chat.typing": ChatTypingJobPayload;
};

var globalForQueue = globalThis as typeof globalThis & {
  __thirtyFiveMmApiQueue?: Queue | null;
};

var queue: Queue | null | undefined = globalForQueue.__thirtyFiveMmApiQueue;

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

  if (name === "counter.outbox") {
    return {
      attempts: 6,
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

  if (name === "chat.typing") {
    return {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: true,
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

export async function enqueueChatJob<Name extends ChatJobName>(
  name: Name,
  payload: ChatJobPayloadByName[Name]
): Promise<boolean> {
  var q = getQueue();
  if (!q) {
    console.warn("[" + name + "] queue disabled", payload);
    return false;
  }

  try {
    await q.add(name, payload, defaultJobOptions(name));
  } catch (error) {
    console.warn("[" + name + "] enqueue failed", { payload, error });
    return false;
  }

  return true;
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
  globalForQueue.__thirtyFiveMmApiQueue = queue;
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

export async function enqueueListCloneJob(payload: ListCloneJobPayload): Promise<boolean> {
  var q = getQueue();
  if (!q) {
    console.warn("[list.clone] queue disabled", payload);
    return false;
  }

  var sourceListId = payload.sourceListId.trim();
  var targetListId = payload.targetListId.trim();
  if (!sourceListId || !targetListId) {
    console.error("[list.clone] invalid payload", payload);
    return false;
  }

  var normalizedCursor = payload.cursor && payload.cursor.trim().length > 0
    ? payload.cursor.trim()
    : null;
  var cursorKey = normalizedCursor ? Buffer.from(normalizedCursor).toString("hex") : "start";
  var jobId = "list.clone-" + targetListId + "-" + cursorKey;

  try {
    await q.add("list.clone", {
      sourceListId,
      targetListId,
      cursor: normalizedCursor,
    }, {
      ...defaultJobOptions("list.clone"),
      jobId,
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  } catch (error) {
    console.warn("[list.clone] enqueue failed", { payload, error });
    return false;
  }

  return true;
}

export async function enqueueProfileFollowApprovalJob(
  payload: ProfileFollowApprovalJobPayload
): Promise<boolean> {
  var q = getQueue();
  if (!q) {
    console.error("[profile.followApproval] queue disabled; rejecting mutation", payload);
    throw serviceUnavailable(
      "PROFILE_FOLLOW_APPROVAL_QUEUE_UNAVAILABLE",
      "Profile follow approval queue is unavailable; retry this request"
    );
  }

  var targetUserId = payload.targetUserId.trim();
  if (!targetUserId) {
    console.error("[profile.followApproval] invalid payload", payload);
    throw new ApiError(500, "PROFILE_FOLLOW_APPROVAL_INVALID_PAYLOAD", "Invalid profile follow-approval payload");
  }

  var cursor = payload.cursor && payload.cursor.trim().length > 0 ? payload.cursor.trim() : null;
  var cursorKey = cursor ? Buffer.from(cursor).toString("hex") : "start";
  var jobId = "profile.followApproval-" + targetUserId + "-" + cursorKey;

  try {
    await q.add("profile.followApproval", {
      targetUserId,
      cursor,
    }, {
      ...defaultJobOptions("profile.followApproval"),
      jobId,
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  } catch (error) {
    console.warn("[profile.followApproval] enqueue failed", { payload, error });
    throw serviceUnavailable(
      "PROFILE_FOLLOW_APPROVAL_QUEUE_UNAVAILABLE",
      "Profile follow approval queue is unavailable; retry this request"
    );
  }

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
    throw new ApiError(500, "COUNTER_QUEUE_INVALID_PAYLOAD", "Invalid counter delta");
  }

  var q = getQueue();
  if (!q) {
    console.error("[counter.increment] queue disabled; rejecting mutation", payload);
    throw serviceUnavailable(
      "COUNTER_QUEUE_UNAVAILABLE",
      "Counter queue is unavailable; retry the mutation"
    );
  }

  try {
    await q.add("counter.increment", payload, defaultJobOptions("counter.increment"));
  } catch (error) {
    console.error("[counter.increment] enqueue failed; rejecting mutation", { payload, error });
    throw serviceUnavailable(
      "COUNTER_QUEUE_UNAVAILABLE",
      "Counter queue is unavailable; retry the mutation"
    );
  }

  return true;
}

export async function enqueueCounterOutboxDrainJob(): Promise<boolean> {
  try {
    var q = getQueue();
    if (!q) {
      console.warn("[counter.outbox] queue disabled");
      return false;
    }

    await q.add("counter.outbox", {}, {
      ...defaultJobOptions("counter.outbox"),
      jobId: "counter.outbox-wake-" + Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    console.warn("[counter.outbox] enqueue failed", { error });
    return false;
  }

  return true;
}

export async function closeApiQueue(): Promise<void> {
  await queue?.close();
  queue = undefined;
  globalForQueue.__thirtyFiveMmApiQueue = undefined;
}
