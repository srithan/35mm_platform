import { beforeEach, expect, it, vi } from "vitest";
import type { Queue } from "bullmq";
const mocks = vi.hoisted(() => ({ rows: [] as unknown[], limit: vi.fn(), reconcile: vi.fn() }));
vi.mock("../lib/env.js", () => ({ loadWorkerEnv: () => ({ DATABASE_URL: "test", BUNNY_STREAM_LIBRARY_ID: "123" }) }));
vi.mock("@35mm/db/video-service", () => ({ reconcileVideo: mocks.reconcile }));
vi.mock("@35mm/db", () => ({ createDb: () => ({ select: () => {
  const query = { from: () => query, where: () => query, orderBy: () => query, limit: mocks.limit };
  return query;
} }) }));
import { enqueuePendingVideoChecks, runVideoReconcile } from "./videoReconcile.js";
beforeEach(() => {
  mocks.rows = []; mocks.limit.mockReset().mockImplementation(async () => mocks.rows);
  mocks.reconcile.mockReset().mockResolvedValue({ state: "ready" });
});
it("recovers due assets in bounded deduplicated jobs after the uploader closes", async () => {
  mocks.rows = [{ id: "d5f5a4c6-23be-4567-8901-234567890123" }];
  const addBulk = vi.fn();
  expect(await enqueuePendingVideoChecks({ addBulk } as unknown as Queue)).toEqual({ enqueued: 1 });
  expect(mocks.limit).toHaveBeenCalledWith(500);
  expect(addBulk).toHaveBeenCalledWith([expect.objectContaining({ name: "video.reconcile", data: mocks.rows[0],
    opts: expect.objectContaining({ jobId: "video.reconcile-d5f5a4c6-23be-4567-8901-234567890123", attempts: 5, removeOnFail: true }) })]);
});
it("reconciles a posted asset without a browser request", async () => {
  const asset = { id: "d5f5a4c6-23be-4567-8901-234567890123", postId: "post", state: "processing" };
  mocks.rows = [asset];
  expect(await runVideoReconcile({ id: asset.id })).toEqual({ found: true, state: "ready" });
  expect(mocks.reconcile).toHaveBeenCalledWith(expect.anything(), asset, expect.anything());
});
