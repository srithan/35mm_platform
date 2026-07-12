import { createDb } from "@35mm/db";
import { createNotificationService } from "@35mm/db/notification-service";
import type { Queue } from "bullmq";
import { loadWorkerEnv } from "./env.js";

var db: ReturnType<typeof createDb> | null = null;

function getDb() {
  if (!db) db = createDb(loadWorkerEnv().DATABASE_URL);
  return db;
}

export function workerNotificationService(queue: Queue) {
  return createNotificationService({
    getDb,
    enqueuePublish: async function (notificationIds, delayMs) {
      if (notificationIds.length === 0) return true;
      await queue.addBulk(notificationIds.map(function (notificationId) {
        return {
          name: "notification.publish",
          data: { notificationId },
          opts: {
            jobId: "notification.publish-" + notificationId,
            delay: delayMs,
            attempts: 3,
            backoff: { type: "exponential", delay: 1_000 },
            removeOnComplete: true,
            removeOnFail: 1000,
          },
        };
      }));
      return true;
    },
  });
}
