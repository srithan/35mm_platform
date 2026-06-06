import { Queue } from "bullmq";
import { WORKER_QUEUE_NAME } from "./queue.js";
import { loadWorkerEnv } from "./env.js";
export const SUGGESTION_JOB_NAME = "compute-suggestions";
export var suggestionQueue = null;
function connectionFromRedisUrl(redisUrl) {
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
function getRedisUrl() {
    var env = loadWorkerEnv();
    var direct = env.UPSTASH_REDIS_URL.trim();
    if (direct)
        return direct;
    var restUrl = env.UPSTASH_REDIS_REST_URL.trim();
    var restToken = env.UPSTASH_REDIS_REST_TOKEN.trim();
    if (!restUrl || !restToken) {
        throw new Error("Missing Redis queue config. Set UPSTASH_REDIS_URL or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN");
    }
    var parsed = new URL(restUrl);
    return `rediss://default:${encodeURIComponent(restToken)}@${parsed.host}:6379`;
}
function getQueue() {
    if (suggestionQueue)
        return suggestionQueue;
    var redisUrl = getRedisUrl();
    suggestionQueue = new Queue(WORKER_QUEUE_NAME, {
        connection: connectionFromRedisUrl(redisUrl),
    });
    return suggestionQueue;
}
function defaultJobOptions() {
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
export async function enqueueSuggestionRefresh(userId) {
    var trimmedUserId = userId.trim();
    if (!trimmedUserId)
        return;
    await getQueue().add(SUGGESTION_JOB_NAME, {
        userId: trimmedUserId,
    }, {
        ...defaultJobOptions(),
        jobId: "compute-suggestions-" + trimmedUserId,
    });
}
export async function closeSuggestionQueue() {
    await suggestionQueue?.close();
    suggestionQueue = null;
}
