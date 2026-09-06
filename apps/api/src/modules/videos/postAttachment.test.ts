import { expect, it } from "vitest";
import type { VideoAsset } from "@35mm/db/video-service";
import { preparePostVideo } from "./postAttachment.js";
const base = { id: "asset", userId: "owner", purpose: "post", state: "processing", isDeleted: false,
  postId: null, providerId: null, stagingProviderId: "staged", createdAt: new Date() } as VideoAsset;
it.each(["processing", "ready"] as const)("accepts %s owned media without waiting for a provider ID", (state) => {
  expect(preparePostVideo({ ...base, state }, "owner", "hash").replay).toBeNull();
});
it.each(["creating", "uploading", "failed"] as const)("rejects unattached %s media", (state) => {
  expect(() => preparePostVideo({ ...base, state }, "owner", "hash")).toThrow("Finish uploading");
});
it.each([{ userId: "other" }, { isDeleted: true }, { purpose: "film" as const }])("rejects unauthorized or incompatible media %j", (change) => {
  expect(() => preparePostVideo({ ...base, ...change }, "owner", "hash")).toThrow("cannot be attached");
});
it("replays the same post even if processing subsequently failed", () => {
  expect(preparePostVideo({ ...base, state: "failed", postId: "post", postRequestHash: "hash" }, "owner", "hash").replay)
    .toMatchObject({ postId: "post", replayed: true });
});
it("rejects reuse for a changed submission", () => {
  expect(() => preparePostVideo({ ...base, postId: "post", postRequestHash: "first" }, "owner", "second"))
    .toThrow("different post");
});
