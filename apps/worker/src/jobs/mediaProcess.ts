import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createDb } from "@35mm/db";
import { posts, profiles, type PostMedia } from "@35mm/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { encode as encodeBlurhash } from "blurhash";
import { loadWorkerEnv, type WorkerEnv } from "../lib/env.js";

type PostRow = {
  id: string;
  media: PostMedia[];
  mediaUrls: string[] | null;
};

export type MediaProcessJobPayload =
  | {
      postId: string;
    }
  | {
      kind: "avatar" | "cover";
      userId: string;
      objectKey: string;
    };

var s3Client: S3Client | null = null;

function getDb() {
  var env = loadWorkerEnv();
  return createDb(env.DATABASE_URL);
}

function getS3Client(env: WorkerEnv) {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    region: "auto",
    endpoint: "https://" + env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
  return s3Client;
}

function normalizePublicBaseUrl(baseUrl: string): URL {
  return new URL(baseUrl.trim().replace(/\/+$/, ""));
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function keyFromMediaItem(item: PostMedia, env: WorkerEnv): string | null {
  if (item.key && item.key.trim().length > 0) {
    return item.key.trim();
  }
  if (!item.url || item.url.trim().length === 0) return null;

  var url: URL;
  try {
    url = new URL(item.url);
  } catch (_err) {
    return null;
  }

  var base = normalizePublicBaseUrl(env.R2_PUBLIC_BASE_URL);
  if (url.host.toLowerCase() !== base.host.toLowerCase()) return null;

  var path = trimSlashes(url.pathname);
  var basePath = trimSlashes(base.pathname);
  if (!basePath) return path || null;
  if (path === basePath) return null;
  if (path.startsWith(basePath + "/")) {
    return path.slice(basePath.length + 1);
  }
  return path || null;
}

function splitObjectKey(value: string): { base: string; ext: string } {
  var lastDot = value.lastIndexOf(".");
  if (lastDot <= 0) {
    return { base: value, ext: "" };
  }
  return { base: value.slice(0, lastDot), ext: value.slice(lastDot) };
}

function variantObjectKeys(sourceKey: string): { thumb: string; feed: string; full: string } {
  var parts = splitObjectKey(sourceKey);
  return {
    thumb: parts.base + "__thumb.webp",
    feed: parts.base + "__feed.webp",
    full: parts.base + "__full.webp",
  };
}

function profileMediaVariantObjectKeys(
  sourceKey: string,
  kind: "avatar" | "cover"
): { sm: string; lg: string } | { default: string } {
  var parts = splitObjectKey(sourceKey);
  var filename = parts.base.split("/").pop() ?? parts.base;
  var dir = parts.base.slice(0, Math.max(0, parts.base.length - filename.length)).replace(/\/+$/, "");
  var prefix = dir.length > 0 ? dir + "/" : "";
  if (kind === "avatar") {
    return {
      sm: prefix + "sm_" + filename + ".webp",
      lg: prefix + "lg_" + filename + ".webp",
    };
  }
  return {
    default: prefix + "default_" + filename + ".webp",
  };
}

function publicUrlForKey(baseUrl: string, key: string): string {
  return baseUrl.replace(/\/+$/, "") + "/" + key.replace(/^\/+/, "");
}

function cfImagesDeliveryUrl(env: WorkerEnv, imageId: string, variantId: string): string | null {
  var baseUrl =
    env.CF_IMAGES_DELIVERY_BASE_URL && env.CF_IMAGES_DELIVERY_BASE_URL.trim().length > 0
      ? env.CF_IMAGES_DELIVERY_BASE_URL.trim().replace(/\/+$/, "")
      : env.CF_IMAGES_ACCOUNT_HASH
        ? "https://imagedelivery.net/" + env.CF_IMAGES_ACCOUNT_HASH.replace(/\/+$/, "")
        : "";
  if (!baseUrl) return null;

  return (
    baseUrl +
    "/" +
    imageId
      .split("/")
      .map(function (segment) {
        return encodeURIComponent(segment);
      })
      .join("/") +
    "/" +
    variantId
  );
}

function needsVariantProcessing(item: PostMedia): boolean {
  if (item.type !== "image") return false;
  if (!item.variants?.feed || !item.variants?.full || !item.variants?.thumb) return true;
  if (!item.blurhash) return true;
  return false;
}

export function postNeedsMediaProcessing(media: PostMedia[]): boolean {
  return media.some(function (item) {
    return needsVariantProcessing(item);
  });
}

async function getObjectBytes(env: WorkerEnv, key: string): Promise<Uint8Array> {
  var response = await getS3Client(env).send(
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    })
  );
  if (!response.Body) {
    throw new Error("Missing R2 body for key: " + key);
  }
  return await response.Body.transformToByteArray();
}

async function putWebpVariant(env: WorkerEnv, key: string, body: Buffer) {
  await getS3Client(env).send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

async function uploadSourceToCloudflareImages(env: WorkerEnv, sourceUrl: string, imageId: string) {
  if (!env.CF_IMAGES_ACCOUNT_ID || !env.CF_IMAGES_API_TOKEN || !env.CF_IMAGES_ACCOUNT_HASH) {
    return null;
  }

  var form = new FormData();
  form.set("url", sourceUrl);
  form.set("id", imageId);
  form.set("requireSignedURLs", "false");

  var response = await fetch(
    "https://api.cloudflare.com/client/v4/accounts/" + env.CF_IMAGES_ACCOUNT_ID + "/images/v1",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.CF_IMAGES_API_TOKEN,
      },
      body: form,
    }
  );

  if (!response.ok) {
    throw new Error("Cloudflare Images upload failed with status " + response.status);
  }

  var payload = (await response.json()) as {
    result?: { id?: string; variants?: string[] };
  };
  return payload.result?.id ?? imageId;
}

async function computeBlurhash(buffer: Uint8Array): Promise<string | null> {
  try {
    var raw = await sharp(buffer)
      .ensureAlpha()
      .resize(32, 32, { fit: "inside", withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    return encodeBlurhash(
      new Uint8ClampedArray(raw.data),
      raw.info.width,
      raw.info.height,
      4,
      3
    );
  } catch (_err) {
    return null;
  }
}

async function processImageMediaItem(env: WorkerEnv, item: PostMedia): Promise<PostMedia> {
  var sourceKey = keyFromMediaItem(item, env);
  if (!sourceKey) return item;

  var objectBytes = await getObjectBytes(env, sourceKey);
  var variants = variantObjectKeys(sourceKey);

  var thumbBuffer = await sharp(objectBytes)
    .rotate()
    .resize({ width: 320, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  var feedBuffer = await sharp(objectBytes)
    .rotate()
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  var fullBuffer = await sharp(objectBytes)
    .rotate()
    .resize({ width: 2048, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  var sourceMeta = await sharp(objectBytes).metadata();
  var blurhash = await computeBlurhash(objectBytes);

  await Promise.all([
    putWebpVariant(env, variants.thumb, thumbBuffer),
    putWebpVariant(env, variants.feed, feedBuffer),
    putWebpVariant(env, variants.full, fullBuffer),
  ]);

  var sourceUrl = publicUrlForKey(env.R2_PUBLIC_BASE_URL, sourceKey);
  var uploadedImageId: string | null = null;
  try {
    uploadedImageId = await uploadSourceToCloudflareImages(env, sourceUrl, sourceKey);
  } catch (error) {
    console.warn("[media-process] Cloudflare Images upload failed; using R2 variants", {
      key: sourceKey,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  var thumbUrl =
    uploadedImageId && env.CF_IMAGES_ACCOUNT_HASH
      ? cfImagesDeliveryUrl(env, uploadedImageId, env.CF_IMAGES_DEFAULT_THUMB_VARIANT) ?? publicUrlForKey(env.R2_PUBLIC_BASE_URL, variants.thumb)
      : publicUrlForKey(env.R2_PUBLIC_BASE_URL, variants.thumb);
  var feedUrl =
    uploadedImageId && env.CF_IMAGES_ACCOUNT_HASH
      ? cfImagesDeliveryUrl(env, uploadedImageId, env.CF_IMAGES_DEFAULT_FEED_VARIANT) ?? publicUrlForKey(env.R2_PUBLIC_BASE_URL, variants.feed)
      : publicUrlForKey(env.R2_PUBLIC_BASE_URL, variants.feed);
  var fullUrl =
    uploadedImageId && env.CF_IMAGES_ACCOUNT_HASH
      ? cfImagesDeliveryUrl(env, uploadedImageId, env.CF_IMAGES_DEFAULT_FULL_VARIANT) ?? publicUrlForKey(env.R2_PUBLIC_BASE_URL, variants.full)
      : publicUrlForKey(env.R2_PUBLIC_BASE_URL, variants.full);

  return {
    ...item,
    key: sourceKey,
    url: fullUrl,
    thumbnailUrl: thumbUrl,
    width: sourceMeta.width ?? item.width,
    height: sourceMeta.height ?? item.height,
    blurhash: blurhash ?? item.blurhash,
    variants: {
      thumb: thumbUrl,
      feed: feedUrl,
      full: fullUrl,
    },
  };
}

async function processProfileMedia(
  env: WorkerEnv,
  payload: Extract<MediaProcessJobPayload, { kind: "avatar" | "cover" }>
): Promise<{ changed: boolean; variants: Record<string, string> }> {
  var objectBytes = await getObjectBytes(env, payload.objectKey);
  var variantKeys = profileMediaVariantObjectKeys(payload.objectKey, payload.kind);

  // To backfill variants for existing avatars and covers, run:
  // pnpm --filter @35mm/worker backfill:avatars
  if (payload.kind === "avatar") {
    var avatarKeys = variantKeys as { sm: string; lg: string };
    var smBuffer = await sharp(objectBytes)
      .rotate()
      .resize(64, 64, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();
    var lgBuffer = await sharp(objectBytes)
      .rotate()
      .resize(320, 320, { fit: "cover", position: "centre" })
      .webp({ quality: 85 })
      .toBuffer();

    await Promise.all([
      putWebpVariant(env, avatarKeys.sm, smBuffer),
      putWebpVariant(env, avatarKeys.lg, lgBuffer),
    ]);

    var avatarVariants = {
      sm: publicUrlForKey(env.R2_PUBLIC_BASE_URL, avatarKeys.sm),
      lg: publicUrlForKey(env.R2_PUBLIC_BASE_URL, avatarKeys.lg),
    };

    await getDb()
      .update(profiles)
      .set({
        avatarVariants,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, payload.userId));

    return { changed: true, variants: avatarVariants };
  }

  var coverKeys = variantKeys as { default: string };
  var defaultBuffer = await sharp(objectBytes)
    .rotate()
    .resize(1200, 400, { fit: "cover", position: "centre" })
    .webp({ quality: 85 })
    .toBuffer();

  await putWebpVariant(env, coverKeys.default, defaultBuffer);

  var coverVariants = {
    default: publicUrlForKey(env.R2_PUBLIC_BASE_URL, coverKeys.default),
  };

  await getDb()
    .update(profiles)
    .set({
      coverVariants,
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, payload.userId));

  return { changed: true, variants: coverVariants };
}

async function processPostRow(env: WorkerEnv, row: PostRow): Promise<boolean> {
  var media = Array.isArray(row.media) ? row.media : [];
  var updatedMedia: PostMedia[] = [];
  var changed = false;

  for (var index = 0; index < media.length; index += 1) {
    var item = media[index];
    if (!needsVariantProcessing(item)) {
      updatedMedia.push(item);
      continue;
    }

    try {
      var nextItem = await processImageMediaItem(env, item);
      updatedMedia.push(nextItem);
      if (nextItem !== item) changed = true;
    } catch (error) {
      console.error("[media-process] failed item", {
        postId: row.id,
        mediaIndex: index,
        message: error instanceof Error ? error.message : String(error),
      });
      updatedMedia.push(item);
    }
  }

  if (!changed) return false;

  var nextMediaUrls = updatedMedia
    .filter(function (item) {
      return item.type === "image";
    })
    .map(function (item) {
      return item.variants?.feed || item.url;
    });

  var db = getDb();
  await db
    .update(posts)
    .set({
      media: updatedMedia,
      mediaUrls: nextMediaUrls,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, row.id));

  return true;
}

async function fetchCandidateRows(limit: number): Promise<PostRow[]> {
  var db = getDb();
  return await db
    .select({
      id: posts.id,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
    })
    .from(posts)
    .where(and(eq(posts.isDeleted, false), sql`${posts.media} <> '[]'::jsonb`))
    .orderBy(desc(posts.updatedAt))
    .limit(limit);
}

async function fetchRowByPostId(postId: string): Promise<PostRow | null> {
  var db = getDb();
  var rows = await db
    .select({
      id: posts.id,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false), sql`${posts.media} <> '[]'::jsonb`))
    .limit(1);
  return rows[0] ?? null;
}

export async function processMediaRows(rows: PostRow[]): Promise<number> {
  var env = loadWorkerEnv();
  var updatedCount = 0;
  for (var index = 0; index < rows.length; index += 1) {
    var changed = await processPostRow(env, rows[index]);
    if (changed) updatedCount += 1;
  }
  return updatedCount;
}

export async function runMediaProcessJob() {
  var env = loadWorkerEnv();
  var desiredBatchSize = Number.isFinite(env.MEDIA_JOB_BATCH_SIZE)
    ? Math.max(1, env.MEDIA_JOB_BATCH_SIZE)
    : 20;
  var rows = await fetchCandidateRows(Math.max(desiredBatchSize * 4, desiredBatchSize));
  var candidates = rows.filter(function (row) {
    return row.media.some(function (item) {
      return needsVariantProcessing(item);
    });
  });
  var batch = candidates.slice(0, desiredBatchSize);
  if (batch.length === 0) {
    console.log("[media-process] nothing to process");
    return;
  }
  var updated = await processMediaRows(batch);
  console.log("[media-process] processed", batch.length, "posts,", updated, "updated");
}

export async function processPostById(postId: string): Promise<{
  found: boolean;
  changed: boolean;
  skipped: boolean;
}> {
  var row = await fetchRowByPostId(postId);
  if (!row) {
    return { found: false, changed: false, skipped: true };
  }

  if (!postNeedsMediaProcessing(row.media)) {
    return { found: true, changed: false, skipped: true };
  }

  var env = loadWorkerEnv();
  var changed = await processPostRow(env, row);
  return { found: true, changed, skipped: !changed };
}

export async function processProfileMediaByPayload(
  payload: Extract<MediaProcessJobPayload, { kind: "avatar" | "cover" }>
): Promise<{ changed: boolean; skipped: boolean; variants: Record<string, string> }> {
  var env = loadWorkerEnv();
  var result = await processProfileMedia(env, payload);
  return {
    changed: result.changed,
    skipped: !result.changed,
    variants: result.variants,
  };
}
