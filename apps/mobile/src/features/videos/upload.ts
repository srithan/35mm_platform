import type { ApiClient } from "@35mm/api-client";
import type { VideoAssetStatus } from "@35mm/types";
import { VIDEO_POST_MAX_BYTES } from "@35mm/validators/video";
import * as Crypto from "expo-crypto";
import { fetch as expoFetch } from "expo/fetch";
import { File } from "expo-file-system";
import type { ImagePickerAsset } from "expo-image-picker";

import { acknowledgePostVideo, reservePostVideo } from "./api";
import { uploadTusFile } from "./tusUpload";
import {
  findVideoUploadSession,
  removeVideoUploadSession,
  saveVideoUploadSession,
} from "./uploadSessions";

const VIDEO_MAX_DURATION_MS = 10 * 60 * 1_000;
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

export interface SelectedPostVideo {
  readonly uri: string;
  readonly filename: string;
  readonly contentType: string;
  readonly size: number;
  readonly width: number | null;
  readonly height: number | null;
  readonly durationMs: number | null;
}

function contentTypeFor(asset: ImagePickerAsset): string | null {
  if (asset.mimeType && VIDEO_TYPES.has(asset.mimeType)) return asset.mimeType;
  const extension = asset.fileName?.split(".").at(-1)?.toLowerCase();
  return ({ mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska" } as const)[
    extension as "mp4" | "mov" | "webm" | "mkv"
  ] ?? null;
}

export function validateSelectedPostVideo(asset: ImagePickerAsset): SelectedPostVideo {
  if (asset.type !== "video") throw new Error("Choose a video file.");
  const contentType = contentTypeFor(asset);
  if (!contentType) throw new Error("Choose an MP4, MOV, WebM or MKV video.");
  if (!Number.isSafeInteger(asset.fileSize) || !asset.fileSize || asset.fileSize > VIDEO_POST_MAX_BYTES) {
    throw new Error("Post videos must be 120 MB or smaller.");
  }
  if (asset.duration && asset.duration > VIDEO_MAX_DURATION_MS) {
    throw new Error("Post videos must be 10 minutes or shorter.");
  }
  return {
    uri: asset.uri,
    filename: asset.fileName?.trim() || `video.${contentType === "video/quicktime" ? "mov" : "mp4"}`,
    contentType,
    size: asset.fileSize,
    width: asset.width > 0 ? asset.width : null,
    height: asset.height > 0 ? asset.height : null,
    durationMs: asset.duration ?? null,
  };
}

export async function videoUploadFingerprint(
  ownerId: string,
  video: SelectedPostVideo,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify([ownerId, video.uri, video.filename, video.size, video.durationMs, video.width, video.height]),
  );
}

export async function clearVideoUploadRecovery(
  ownerId: string,
  video: SelectedPostVideo,
): Promise<void> {
  await removeVideoUploadSession(await videoUploadFingerprint(ownerId, video));
}

export async function uploadPostVideo(input: {
  readonly client: ApiClient;
  readonly ownerId: string;
  readonly video: SelectedPostVideo;
  readonly signal?: AbortSignal;
  readonly onProgress: (percent: number) => void;
  readonly onProcessing: () => void;
}): Promise<VideoAssetStatus> {
  const fingerprint = await videoUploadFingerprint(input.ownerId, input.video);
  let stored = await findVideoUploadSession(fingerprint);
  if (!stored) {
    stored = {
      fingerprint,
      idempotencyKey: Crypto.randomUUID(),
      uploadUrl: null,
      createdAt: Date.now(),
    };
    await saveVideoUploadSession(stored);
  }
  const session = await reservePostVideo(
    input.client,
    {
      idempotencyKey: stored.idempotencyKey,
      filename: input.video.filename,
      contentType: input.video.contentType,
      contentLength: input.video.size,
    },
    input.signal,
  );
  if (!("endpoint" in session) && (session.state === "ready" || session.state === "processing")) return session;
  if (!("endpoint" in session) && session.state === "failed") {
    await removeVideoUploadSession(fingerprint);
    throw new Error(session.failureReason ?? "Video processing failed. Select the video again.");
  }

  if (!("endpoint" in session)) throw new Error("Video upload session is unavailable.");
  const file = new File(input.video.uri);
  if (!file.exists || file.size !== input.video.size) {
    throw new Error("Selected video is no longer available. Choose it again.");
  }
  await uploadTusFile({
    file: {
      name: input.video.filename,
      size: input.video.size,
      type: input.video.contentType,
      slice: file.slice.bind(file),
    },
    credentials: session,
    fetchImpl: expoFetch as typeof globalThis.fetch,
    previousUploadUrl: stored.uploadUrl,
    ...(input.signal ? { signal: input.signal } : {}),
    onProgress: input.onProgress,
    onUploadUrl: async (uploadUrl) => {
      stored = { ...stored!, uploadUrl };
      await saveVideoUploadSession(stored);
    },
  });
  input.onProcessing();
  const status = await acknowledgePostVideo(
    input.client,
    session.id,
    stored.idempotencyKey,
    input.signal,
  );
  if (status.state === "failed") {
    await removeVideoUploadSession(fingerprint);
    throw new Error(status.failureReason ?? "Video processing failed. Select the video again.");
  }
  return status;
}
