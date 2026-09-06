import type { VideoAsset } from "@35mm/db/video-service";
import { badRequest, conflict } from "../../lib/errors.js";

/** Called with the asset locked by the post transaction, before inserting a post. */
export function preparePostVideo(asset: VideoAsset | undefined, userId: string, requestHash: string | null) {
  if (!asset || asset.userId !== userId || asset.isDeleted || asset.purpose !== "post") {
    throw badRequest("Video does not belong to you or cannot be attached to a post");
  }
  // A retry of an accepted post stays idempotent even if encoding subsequently fails.
  if (asset.postId) {
    if (asset.postRequestHash !== requestHash) throw conflict("This upload is already attached to a different post");
    return { asset, replay: { postId: asset.postId, postCreatedAt: asset.createdAt, replayed: true as const } };
  }
  if (asset.state !== "processing" && asset.state !== "ready") {
    throw badRequest("Finish uploading your video before posting");
  }
  return { asset, replay: null };
}
