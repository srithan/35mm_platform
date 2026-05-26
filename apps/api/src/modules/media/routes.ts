import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { badRequest, unauthorized } from "../../lib/errors.js";
import { requireAuth } from "../../lib/middleware.js";
import { loadEnv } from "../../lib/env.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { buildCfImagesVariantUrl } from "./cfImages.js";
import { isR2ConfiguredPublicUrl, resolvePublicMediaUrl } from "./url.js";

export var mediaRoutes = new Hono();

type MediaKind = "avatar" | "cover" | "post_media";

interface PresignBody {
  kind?: string;
  contentType?: string;
  contentLength?: number;
}

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  contentType: string;
  expiresInSeconds: number;
  variants: {
    thumb: string;
    feed: string;
    full: string;
  };
}

var MAX_IMAGE_BYTES = 12 * 1024 * 1024;
var MAX_VIDEO_BYTES = 120 * 1024 * 1024;

function isAuthorizedR2Configured(): string | null {
  var env = loadEnv();
  if (!env.R2_ACCOUNT_ID) return "Missing R2_ACCOUNT_ID";
  if (!env.R2_ACCESS_KEY_ID) return "Missing R2_ACCESS_KEY_ID";
  if (!env.R2_SECRET_ACCESS_KEY) return "Missing R2_SECRET_ACCESS_KEY";
  if (!env.R2_PUBLIC_BASE_URL) return "Missing R2_PUBLIC_BASE_URL";
  return null;
}

function assertMediaKind(value: string | undefined): MediaKind {
  if (value === "avatar" || value === "cover" || value === "post_media") return value;
  throw badRequest("Unsupported media kind");
}

function normalizeContentType(value: string | undefined, fallback = "image/jpeg"): string {
  var candidate = value ? value.toLowerCase().trim() : "";
  if (
    candidate === "image/jpeg" ||
    candidate === "image/png" ||
    candidate === "image/webp" ||
    candidate === "image/gif" ||
    candidate === "video/mp4" ||
    candidate === "video/webm"
  ) {
    return candidate;
  }
  return fallback;
}

function extensionForContentType(contentType: string): string {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/gif") return ".gif";
  if (contentType === "video/mp4") return ".mp4";
  if (contentType === "video/webm") return ".webm";
  return ".jpg";
}

function getBucketName(): string {
  return loadEnv().R2_BUCKET;
}

function getPublicBaseUrl(): string {
  var env = loadEnv();
  var baseUrl = env.R2_PUBLIC_BASE_URL.trim().replace(/\/+$/, "");
  var parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch (_err) {
    throw badRequest("Invalid R2_PUBLIC_BASE_URL");
  }

  if (parsedBaseUrl.host.endsWith(".r2.cloudflarestorage.com")) {
    throw badRequest(
      "R2_PUBLIC_BASE_URL must be a public endpoint (pub-*.r2.dev or custom domain), not " +
        parsedBaseUrl.host
    );
  }

  return baseUrl;
}

function getPresignTtl(): number {
  var ttl = loadEnv().R2_PRESIGN_TTL_SECONDS;
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 900;
}

function splitObjectKey(value: string): { base: string; ext: string } {
  var lastDot = value.lastIndexOf(".");
  if (lastDot <= 0) {
    return { base: value, ext: "" };
  }
  return {
    base: value.slice(0, lastDot),
    ext: value.slice(lastDot),
  };
}

function variantObjectKeys(objectKey: string): { thumb: string; feed: string; full: string } {
  var parts = splitObjectKey(objectKey);
  return {
    thumb: parts.base + "__thumb.webp",
    feed: parts.base + "__feed.webp",
    full: parts.base + "__full.webp",
  };
}

function joinPublicUrl(baseUrl: string, key: string): string {
  return baseUrl + "/" + key.replace(/^\/+/, "");
}

function mediaVariantsForKey(key: string): { thumb: string; feed: string; full: string } {
  var cfThumb = buildCfImagesVariantUrl(key, loadEnv().CF_IMAGES_DEFAULT_THUMB_VARIANT);
  var cfFeed = buildCfImagesVariantUrl(key, loadEnv().CF_IMAGES_DEFAULT_FEED_VARIANT);
  var cfFull = buildCfImagesVariantUrl(key, loadEnv().CF_IMAGES_DEFAULT_FULL_VARIANT);

  if (cfThumb && cfFeed && cfFull) {
    return {
      thumb: cfThumb,
      feed: cfFeed,
      full: cfFull,
    };
  }

  var baseUrl = getPublicBaseUrl();
  return {
    thumb: joinPublicUrl(baseUrl, variantObjectKeys(key).thumb),
    feed: joinPublicUrl(baseUrl, variantObjectKeys(key).feed),
    full: joinPublicUrl(baseUrl, variantObjectKeys(key).full),
  };
}

function createS3Client() {
  var env = loadEnv();
  return new S3Client({
    region: "auto",
    endpoint: "https://" + env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

mediaRoutes.post("/presign", requireAuth, async function (c) {
  var user = c.get("user");
  var envError = isAuthorizedR2Configured();
  if (envError) {
    throw unauthorized(envError);
  }

  var body = (await c.req.json()) as PresignBody;
  var kind = assertMediaKind(body.kind);
  var contentType = normalizeContentType(body.contentType);
  var contentLength = Number(body.contentLength ?? 0);
  if (Number.isNaN(contentLength) || contentLength <= 0) {
    throw badRequest("contentLength must be a positive number");
  }

  if (contentType.startsWith("video/")) {
    if (contentLength > MAX_VIDEO_BYTES) {
      throw badRequest("Video size exceeds 120MB limit");
    }
  } else if (contentLength > MAX_IMAGE_BYTES) {
    throw badRequest("File size exceeds 12MB limit");
  }

  var suffix = extensionForContentType(contentType);
  var key =
    "users/" +
    user.userId +
    "/" +
    kind +
    "/" +
    Date.now().toString(36) +
    "-" +
    randomUUID() +
    suffix;

  var command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
    Metadata: {
      owner: user.userId,
      kind,
    },
  });

  var uploadUrl = await getSignedUrl(createS3Client(), command, {
    expiresIn: getPresignTtl(),
  });

  var response: PresignResponse = {
    uploadUrl,
    publicUrl: getPublicBaseUrl() + "/" + key,
    objectKey: key,
    contentType,
    expiresInSeconds: getPresignTtl(),
    variants: mediaVariantsForKey(key),
  };

  return c.json(response);
});

mediaRoutes.get("/resolve-url", async function (c) {
  var candidateUrl = c.req.query("url");
  if (!candidateUrl || typeof candidateUrl !== "string" || candidateUrl.trim().length === 0) {
    throw badRequest("Missing url");
  }

  var trimmed = candidateUrl.trim();
  if (!isR2ConfiguredPublicUrl(trimmed)) {
    return c.json({ url: trimmed });
  }

  var resolvedUrl = await resolvePublicMediaUrl(trimmed);
  return c.json({ url: resolvedUrl ?? trimmed });
});

mediaRoutes.get("/oembed", async function (c) {
  var rawUrl = c.req.query("url");
  if (!rawUrl || typeof rawUrl !== "string") {
    throw badRequest("Missing url");
  }

  var parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (_err) {
    throw badRequest("Invalid url");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw badRequest("Invalid url protocol");
  }

  var ogsModule = await import("open-graph-scraper");
  var result = await ogsModule.default({
    url: parsed.toString(),
    timeout: 8000,
    fetchOptions: {
      headers: {
        "user-agent": "35mm-bot/1.0",
      },
    },
  });

  var data = result.result;
  var title = data.ogTitle || data.twitterTitle || parsed.hostname;
  var description = data.ogDescription || data.twitterDescription || null;
  var image = Array.isArray(data.ogImage) && data.ogImage[0]?.url ? data.ogImage[0].url : null;

  var domain = parsed.hostname.replace(/^www\./, "");
  var provider: "youtube" | "vimeo" | "link" = "link";
  if (domain.includes("youtube.com") || domain.includes("youtu.be")) provider = "youtube";
  else if (domain.includes("vimeo.com")) provider = "vimeo";

  return c.json({
    url: parsed.toString(),
    title,
    description,
    image,
    domain,
    provider,
  });
});
