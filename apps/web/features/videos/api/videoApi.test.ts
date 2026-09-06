import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiRequestError, apiRequest } from "@/features/feed/api/http";
import { uploadVideo } from "./videoApi";

const tus = vi.hoisted(() => ({ start: vi.fn(), success: () => {} }));
vi.mock("@/features/feed/api/http", async (original) => ({
  ...await original<typeof import("@/features/feed/api/http")>(), apiRequest: vi.fn(),
}));
vi.mock("tus-js-client", () => ({ Upload: class {
  constructor(_file: File, options: { onSuccess: () => void }) { tus.success = options.onSuccess; }
  findPreviousUploads = async () => [];
  start = tus.start;
  abort = async () => {};
} }));
const request = vi.mocked(apiRequest);
const status = { id: "asset", state: "ready", failureReason: null };
beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  request.mockReset();
  tus.start.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  request.mockImplementation(async (path) => {
    if (path === "/v1/videos/uploads") return { id: "asset", state: "uploading", signature: "signed" };
    if (path.endsWith("/complete")) return { ...status, state: "processing" };
    return status;
  });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
function begin(purpose: "film" | "post" = "post", signal?: AbortSignal) {
  const onProcessing = vi.fn();
  const promise = uploadVideo({ file: new File(["video"], "film.mp4", { type: "video/mp4" }),
    purpose, ownerId: "owner", getToken: async () => "token", signal,
    onProgress: vi.fn(), onProcessing });
  return { promise, onProcessing };
}
async function finishTransfer() {
  await vi.waitFor(() => expect(tus.start).toHaveBeenCalled());
  tus.success();
  await vi.advanceTimersByTimeAsync(0);
}
it.each(["post", "film"] as const)("automatically completes and processes %s after transfer without publishing", async (purpose) => {
  const { promise, onProcessing } = begin(purpose);
  await finishTransfer();
  await expect(promise).resolves.toEqual(purpose === "post" ? { ...status, state: "processing" } : status);
  expect(onProcessing).toHaveBeenCalledTimes(1);
  expect(request.mock.calls.map(([path]) => path)).toEqual(purpose === "post"
    ? ["/v1/videos/uploads", "/v1/videos/asset/complete"]
    : ["/v1/videos/uploads", "/v1/videos/asset/complete", "/v1/videos/asset/refresh"]);
  expect(request.mock.calls.some(([path]) => path.endsWith("/publish"))).toBe(false);
});
it.each(["complete", "refresh"])("recovers transient %s failure without another upload or publish click", async (endpoint) => {
  const normal = request.getMockImplementation()!;
  let failed = false;
  request.mockImplementation(async (path, options) => {
    if (path.endsWith(`/${endpoint}`) && !failed) {
      failed = true;
      throw new ApiRequestError("Unavailable", 503);
    }
    return normal(path, options);
  });
  const { promise, onProcessing } = begin("film");
  await finishTransfer();
  expect(onProcessing).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(15_000);
  await expect(promise).resolves.toEqual(status);
  expect(tus.start).toHaveBeenCalledTimes(1);
  expect(request.mock.calls.filter(([path]) => path.endsWith(`/${endpoint}`))).toHaveLength(2);
});
it("bounds retries and surfaces persistent failures", async () => {
  request.mockResolvedValueOnce({ id: "asset", state: "processing" })
    .mockRejectedValue(new ApiRequestError("Unavailable", 503));
  const { promise } = begin("film");
  const rejected = expect(promise).rejects.toThrow("Unavailable");
  await vi.runAllTimersAsync();
  await rejected;
  expect(request).toHaveBeenCalledTimes(6);
});
it("does not retry authorization failures", async () => {
  request.mockResolvedValueOnce({ id: "asset", state: "processing" })
    .mockRejectedValue(new ApiRequestError("Forbidden", 403));
  await expect(begin("film").promise).rejects.toThrow("Forbidden");
  expect(request).toHaveBeenCalledTimes(2);
});
it("cancels pending recovery when file is removed", async () => {
  request.mockResolvedValueOnce({ id: "asset", state: "processing" })
    .mockRejectedValue(new ApiRequestError("Unavailable", 503));
  const controller = new AbortController();
  const { promise } = begin("film", controller.signal);
  const rejected = expect(promise).rejects.toThrow("Upload cancelled");
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await rejected;
  await vi.runAllTimersAsync();
  expect(request).toHaveBeenCalledTimes(2);
});

it("returns an already processing post without polling or uploading again", async () => {
  request.mockResolvedValue({ ...status, state: "processing" });
  await expect(begin().promise).resolves.toMatchObject({ state: "processing" });
  expect(request).toHaveBeenCalledTimes(1);
  expect(tus.start).not.toHaveBeenCalled();
});
