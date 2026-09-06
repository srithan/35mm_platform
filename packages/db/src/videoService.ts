import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, lte } from "drizzle-orm";
import type { Db } from "./index.js";
import { videoAssets } from "./schema/videos.js";

export interface BunnyConfig {
  BUNNY_STREAM_LIBRARY_ID: string;
  BUNNY_STREAM_API_KEY: string;
  BUNNY_STREAM_TOKEN_KEY: string;
  BUNNY_STREAM_WEBHOOK_SECRET: string;
  BUNNY_STREAM_CDN_HOST: string;
}
export type VideoAsset = typeof videoAssets.$inferSelect;
export type BunnyVideo = {
  guid: string;
  videoLibraryId: number;
  title: string;
  status: number;
  length: number;
  width: number;
  height: number;
  storageSize: number;
};
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function assertBunnyConfig(config: BunnyConfig) {
  if (
    !/^\d+$/.test(config.BUNNY_STREAM_LIBRARY_ID) ||
    !config.BUNNY_STREAM_API_KEY ||
    !config.BUNNY_STREAM_TOKEN_KEY ||
    !config.BUNNY_STREAM_WEBHOOK_SECRET ||
    !/^[a-z0-9-]+\.b-cdn\.net$/.test(config.BUNNY_STREAM_CDN_HOST)
  ) {
    throw new Error("Bunny Stream server configuration is incomplete");
  }
}
export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function uploadCredentials(asset: VideoAsset, config: BunnyConfig) {
  if (!asset.providerId || asset.stagingProviderId)
    throw new Error("Video is not accepting uploads");
  // Retries share the original upload window instead of extending access indefinitely.
  const expires = Math.floor(asset.createdAt.getTime() / 1000) + 24 * 60 * 60;
  return {
    endpoint: "https://video.bunnycdn.com/tusupload",
    libraryId: asset.libraryId,
    videoId: asset.providerId,
    expires,
    signature: sha256(
      asset.libraryId +
        config.BUNNY_STREAM_API_KEY +
        expires +
        asset.providerId,
    ),
  };
}
export function playbackUrl(
  asset: VideoAsset,
  config: BunnyConfig,
  now = Date.now(),
) {
  if (!asset.providerId) throw new Error("Video has no provider ID");
  const expires = Math.floor(now / 1000) + 300;
  const token = sha256(
    config.BUNNY_STREAM_TOKEN_KEY + asset.providerId + expires,
  );
  return {
    width: asset.width,
    height: asset.height,
    posterUrl: signedVideoFileUrl(asset.providerId, "thumbnail.jpg", config, expires),
    embedUrl: `https://iframe.mediadelivery.net/embed/${asset.libraryId}/${asset.providerId}?token=${token}&expires=${expires}&autoplay=false&preload=false&responsive=true`,
    expires,
  };
}
export function validWebhook(
  raw: string,
  headers: Headers,
  config: BunnyConfig,
) {
  const signature = headers.get("x-bunnystream-signature") ?? "";
  if (
    headers.get("x-bunnystream-signature-version") !== "v1" ||
    headers.get("x-bunnystream-signature-algorithm") !== "hmac-sha256" ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    !config.BUNNY_STREAM_WEBHOOK_SECRET
  )
    return false;
  const expected = createHmac("sha256", config.BUNNY_STREAM_WEBHOOK_SECRET)
    .update(raw)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export async function bunnyRequest(
  config: BunnyConfig,
  path: string,
  method = "GET",
  body?: unknown,
) {
  assertBunnyConfig(config);
  const response = await fetch(
    `https://video.bunnycdn.com/library/${config.BUNNY_STREAM_LIBRARY_ID}/videos${path}`,
    {
      method,
      headers: {
        AccessKey: config.BUNNY_STREAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    },
  );
  if (method === "DELETE" && response.status === 404) return { success: true };
  if (!response.ok)
    throw new Error(`Bunny Stream request failed (${response.status})`);
  if (method === "DELETE" || response.status === 204) return { success: true };
  return response.json() as Promise<unknown>;
}
export function parseBunnyVideo(raw: unknown, config: BunnyConfig): BunnyVideo {
  const video = raw as BunnyVideo;
  if (
    !video ||
    !UUID.test(video.guid) ||
    String(video.videoLibraryId) !== config.BUNNY_STREAM_LIBRARY_ID ||
    !Number.isInteger(video.status) ||
    typeof video.title !== "string"
  )
    throw new Error("Invalid Bunny video response");
  return video;
}
export async function createBunnyVideo(asset: VideoAsset, config: BunnyConfig) {
  // Stable server-owned title makes an interrupted create discoverable without creating duplicates.
  return parseBunnyVideo(
    await bunnyRequest(config, "", "POST", { title: `35mm:${asset.id}` }),
    config,
  );
}
export function providerState(video: BunnyVideo): VideoAsset["state"] {
  if (
    video.status === 4 &&
    video.length > 0 &&
    video.width > 0 &&
    video.height > 0
  )
    return "ready";
  if (video.status === 5 || video.status === 6) return "failed";
  // GET video status 6 means upload failed; webhook event 6 means upload started.
  if (video.status === 0) return "uploading";
  return "processing";
}
export function videoStatus(asset: VideoAsset) {
  return {
    id: asset.id,
    state: asset.state,
    failureReason: asset.failureReason,
    durationSeconds: asset.durationSeconds,
    width: asset.width,
    height: asset.height,
    filmId: asset.filmId,
    postId: asset.postId,
  };
}
function signedVideoFileUrl(providerId: string, filename: string, config: BunnyConfig, expires: number) {
  const path = `/${providerId}/${filename}`;
  const token = createHash("sha256")
    .update(config.BUNNY_STREAM_TOKEN_KEY + path + expires)
    .digest("base64url");
  return `https://${config.BUNNY_STREAM_CDN_HOST}${path}?token=${token}&expires=${expires}`;
}
export function originalVideoUrl(providerId: string, config: BunnyConfig) {
  const expires = Math.floor(Date.now() / 1000) + 86400;
  const path = `/${providerId}/original`;
  const token = createHash("sha256")
    .update(config.BUNNY_STREAM_TOKEN_KEY + path + expires)
    .digest("base64url");
  return `https://${config.BUNNY_STREAM_CDN_HOST}${path}?token=${token}&expires=${expires}`;
}
export async function reconcileVideo(
  db: Db,
  asset: VideoAsset,
  config: BunnyConfig,
) {
  if (asset.isDeleted || asset.state === "ready" || asset.state === "failed")
    return asset;
  // Atomic lease bounds upstream requests even across workers, tabs and webhook deliveries.
  const claimed = await db
    .update(videoAssets)
    .set({ nextCheckAt: new Date(Date.now() + 60_000) })
    .where(
      and(
        eq(videoAssets.id, asset.id),
        lte(videoAssets.nextCheckAt, new Date()),
        inArray(videoAssets.state, ["creating", "uploading", "processing"]),
        eq(videoAssets.isDeleted, false),
      ),
    )
    .returning();
  if (!claimed[0]) return asset;
  asset = claimed[0];
  let providerId = asset.providerId;
  if (!providerId) {
    const title = asset.stagingProviderId
      ? `35mm:sealed:${asset.id}`
      : `35mm:${asset.id}`;
    const response = (await bunnyRequest(
      config,
      `?search=${encodeURIComponent(title)}&itemsPerPage=2`,
    )) as { items?: unknown[] };
    const matches = (response.items ?? [])
      .map((v) => parseBunnyVideo(v, config))
      .filter((v) => v.title === title);
    if (matches.length > 1)
      throw new Error(`Duplicate Bunny creation for asset ${asset.id}`);
    providerId = matches[0]?.guid ?? null;
    if (!providerId) {
      if (
        Date.now() -
          (asset.finalizationStartedAt ?? asset.createdAt).getTime() <
        (asset.stagingProviderId ? 48 * 60 * 60 * 1000 : 120_000)
      )
        return asset;
      const [failed] = await db
        .update(videoAssets)
        .set({
          state: "failed",
          failureReason: "Video initialization failed. Select the file again.",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(videoAssets.id, asset.id),
            inArray(videoAssets.state, ["creating", "processing"]),
          ),
        )
        .returning();
      return failed ?? asset;
    }
  }
  const video = parseBunnyVideo(
    await bunnyRequest(config, `/${providerId}`),
    config,
  );
  let state = providerState(video);
  // An acknowledged transfer must not regress while the provider starts processing.
  if ((asset.stagingProviderId || asset.state === "processing") && state === "uploading") state = "processing";
  let failureReason: string | null =
    state === "failed"
      ? "Video processing failed. Upload a supported MP4, MOV, WebM or MKV file."
      : null;
  if (state === "ready") {
    const storage = (await bunnyRequest(config, `/${providerId}/storage`)) as {
      success?: boolean;
      data?: { originals?: number };
    };
    const originalBytes = storage.data?.originals;
    if (
      !storage.success ||
      typeof originalBytes !== "number" ||
      !Number.isFinite(originalBytes) ||
      originalBytes <= 0
    ) {
      state = "processing";
    } else if (originalBytes > asset.declaredBytes) {
      state = "failed";
      failureReason = "Uploaded file exceeds the authorized size.";
    }
  }
  if (
    state === "ready" &&
    video.length > (asset.purpose === "post" ? 600 : 4 * 60 * 60)
  ) {
    state = "failed";
    failureReason =
      asset.purpose === "post"
        ? "Post videos must be 10 minutes or shorter."
        : "Films must be 4 hours or shorter.";
  }
  if (
    state !== "ready" &&
    Date.now() - asset.createdAt.getTime() > 48 * 60 * 60 * 1000
  ) {
    state = "failed";
    failureReason = "Upload or processing expired. Select the file again.";
  }
  if (state === "ready" && !asset.stagingProviderId) {
    // Never publish the TUS target: its client grant remains reusable until expiry.
    // Reserve the finalization attempt before the provider call; recover ambiguous results by title.
    const [sealing] = await db
      .update(videoAssets)
      .set({
        stagingProviderId: providerId,
        providerId: null,
        finalizationStartedAt: new Date(),
        state: "processing",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(videoAssets.id, asset.id),
          eq(videoAssets.providerId, providerId),
          eq(videoAssets.isDeleted, false),
        ),
      )
      .returning();
    if (!sealing) return asset;
    await bunnyRequest(config, "/fetch", "POST", {
      title: `35mm:sealed:${asset.id}`,
      url: originalVideoUrl(providerId, config),
      headers: { Referer: "https://iframe.mediadelivery.net/" },
    });
    return sealing;
  }
  if (state === "ready" && asset.stagingProviderId) {
    // Only the server knows the final video's upload credentials. Remove the staging copy
    // before making playback available; DELETE is retry-safe including an already-removed source.
    await bunnyRequest(config, `/${asset.stagingProviderId}`, "DELETE");
  }
  const positive = (n: number) =>
    Number.isFinite(n) && n > 0 ? Math.ceil(n) : null;
  const [updated] = await db
    .update(videoAssets)
    .set({
      providerId,
      state,
      failureReason,
      durationSeconds: positive(video.length),
      width: positive(video.width),
      height: positive(video.height),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(videoAssets.id, asset.id),
        inArray(videoAssets.state, ["creating", "uploading", "processing"]),
        eq(videoAssets.isDeleted, false),
      ),
    )
    .returning();
  return updated ?? asset;
}
