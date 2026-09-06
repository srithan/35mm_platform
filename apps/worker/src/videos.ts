import { Queue, Worker } from "bullmq";
import { enqueuePendingVideoChecks, runVideoReconcile } from "./jobs/videoReconcile.js";
import { loadWorkerEnv } from "./lib/env.js";
import { connectionFromRedisUrl } from "./lib/queue.js";
import { resolveQueueRedisUrl } from "./lib/redisConfig.js";

// A dedicated queue can run video processing without consuming unrelated jobs.
// The full worker's legacy video jobs remain safe alongside it through DB leases.
const queueName = "35mm-video-jobs";
async function main() {
  const env = loadWorkerEnv();
  if (!env.BUNNY_STREAM_LIBRARY_ID) throw new Error("Bunny Stream must be configured to run the video worker");
  const redisUrl = resolveQueueRedisUrl();
  if (!redisUrl) throw new Error("QUEUE_REDIS_URL is required for the video worker");
  const connection = connectionFromRedisUrl(redisUrl, null);
  const queue = new Queue(queueName, { connection });
  const worker = new Worker(queueName, async (job) => {
    if (job.name === "video.sweep") return enqueuePendingVideoChecks(queue);
    if (job.name === "video.reconcile") return runVideoReconcile(job.data);
    throw new Error(`Unsupported video job: ${job.name}`);
  }, { connection, concurrency: 4 });
  queue.on("error", (error) => console.error("[video.worker] queue error", error.message));
  worker.on("error", (error) => console.error("[video.worker] worker error", error.message));
  worker.on("failed", (job, error) => console.error("[video.worker] job failed", {
    jobId: job?.id, name: job?.name, message: error.message,
  }));
  let stopping = false;
  const close = async () => {
    if (stopping) return;
    stopping = true;
    await worker.close();
    await queue.close();
  };
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void close().catch((error) => {
        console.error("[video.worker] shutdown failed", error);
        process.exitCode = 1;
      });
    });
  }
  try {
    await queue.add("video.sweep", {}, {
      jobId: "video.sweep-repeat", repeat: { every: 60000 },
      attempts: 5, backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: true, removeOnFail: 100,
    });
    await worker.waitUntilReady();
    console.info("[video.worker] ready");
  } catch (error) {
    await close();
    throw error;
  }
}
void main().catch((error) => {
  console.error("[video.worker] startup failed", error);
  process.exitCode = 1;
});
