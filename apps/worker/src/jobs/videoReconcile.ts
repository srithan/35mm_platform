import { createDb, type Db } from "@35mm/db";
import { videoAssets } from "@35mm/db/schema";
import { reconcileVideo } from "@35mm/db/video-service";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import type { Queue } from "bullmq";
import { loadWorkerEnv } from "../lib/env.js";

let db: Db | undefined;
function database() {
  return (db ??= createDb(loadWorkerEnv().DATABASE_URL));
}
export async function enqueuePendingVideoChecks(queue: Queue) {
  const env = loadWorkerEnv();
  if (!env.BUNNY_STREAM_LIBRARY_ID) return { enqueued: 0 };
  const rows = await database()
    .select({ id: videoAssets.id })
    .from(videoAssets)
    .where(
      and(
        eq(videoAssets.isDeleted, false),
        inArray(videoAssets.state, ["creating", "uploading", "processing"]),
        lte(videoAssets.nextCheckAt, new Date()),
      ),
    )
    .orderBy(asc(videoAssets.nextCheckAt), asc(videoAssets.id))
    .limit(500);
  if (rows.length)
    await queue.addBulk(
      rows.map((row) => ({
        name: "video.reconcile",
        data: { id: row.id },
        opts: {
          jobId: `video.reconcile-${row.id}`,
          attempts: 5,
          backoff: { type: "exponential", delay: 10000 },
          removeOnComplete: true,
          removeOnFail: true,
        },
      })),
    );
  return { enqueued: rows.length };
}
export async function runVideoReconcile(payload: unknown) {
  const id = (payload as { id?: unknown })?.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("Invalid video.reconcile payload");
  const [asset] = await database()
    .select()
    .from(videoAssets)
    .where(eq(videoAssets.id, id))
    .limit(1);
  if (!asset) return { found: false };
  const updated = await reconcileVideo(database(), asset, loadWorkerEnv());
  return { found: true, state: updated.state };
}
