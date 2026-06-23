import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadEnv } from "../../lib/env.js";

var s3Client: S3Client | null = null;

export type AvatarVariants = { sm?: string; lg?: string };
export type CoverVariants = { default?: string };

function createS3Client(): S3Client {
  if (s3Client) return s3Client;

  var env = loadEnv();
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

function parseConfiguredPublicBaseUrl(): URL | null {
  var env = loadEnv();
  if (!env.R2_PUBLIC_BASE_URL) return null;

  try {
    return new URL(env.R2_PUBLIC_BASE_URL.trim().replace(/\/+$/, ""));
  } catch (_err) {
    return null;
  }
}

function trimLeadingSlash(value: string): string {
  return value.replace(/^\/+/, "");
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function publicMediaUrlForKey(key: string): string | null {
  var baseUrl = parseConfiguredPublicBaseUrl();
  if (!baseUrl) return null;

  return trimTrailingSlash(baseUrl.toString()) + "/" + trimLeadingSlash(key);
}

function warnIfUnexpectedMediaOutput(value: string | null, label: string): void {
  if (!value || loadEnv().NODE_ENV !== "development") return;

  var baseUrl = parseConfiguredPublicBaseUrl();
  if (!baseUrl) return;

  var expectedPrefix = trimTrailingSlash(baseUrl.toString()) + "/";
  if (!value.startsWith(expectedPrefix)) {
    console.warn("[media] resolved media URL outside R2_PUBLIC_BASE_URL", {
      label,
      value,
      expectedPrefix,
    });
  }
}

function isPublicProfileMediaKey(key: string): boolean {
  var parts = trimLeadingSlash(key).split("/");
  return parts[0] === "users" && (parts[2] === "avatar" || parts[2] === "cover");
}

function isFullUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function profileMediaKeyFromStoredValue(
  value: string,
  userId: string,
  kind: "avatar" | "cover"
): string | null {
  var trimmed = value.trim();
  if (!trimmed) return null;

  var extractedKey = getR2ObjectKeyFromUrl(trimmed);
  if (extractedKey) return extractedKey;

  if (isFullUrl(trimmed)) {
    if (loadEnv().NODE_ENV === "development") {
      throw new Error(
        "[media] profile media value is a full non-R2 URL; expected R2 object key or R2 public URL"
      );
    }
    return null;
  }

  var relative = trimLeadingSlash(trimmed);
  if (relative.startsWith("users/")) return relative;

  return "users/" + userId + "/" + kind + "/" + relative;
}

function configuredR2HostAndPath(): { host: string; path: string } {
  var baseUrl = parseConfiguredPublicBaseUrl();
  return {
    host: baseUrl ? baseUrl.host.toLowerCase() : "",
    path: baseUrl
      ? trimTrailingSlash(baseUrl.pathname.toLowerCase())
      : "",
  };
}

function extractObjectKeyFromPathStyleR2Url(parsed: URL): string | null {
  if (!parsed.host.toLowerCase().endsWith(".r2.cloudflarestorage.com")) {
    return null;
  }

  var path = trimLeadingSlash(trimTrailingSlash(parsed.pathname));
  if (!path) return null;

  var bucket = getBucketName();
  var bucketPrefix = trimLeadingSlash(bucket + "/");
  if (path.startsWith(bucketPrefix)) {
    return path.slice(bucketPrefix.length);
  }

  return null;
}

export function getR2ObjectKeyFromUrl(urlString: string): string | null {
  var parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (_err) {
    return null;
  }

  var pathStyleKey = extractObjectKeyFromPathStyleR2Url(parsed);
  if (pathStyleKey) return pathStyleKey;

  var publicConfig = configuredR2HostAndPath();
  if (!publicConfig.host) return null;

  if (parsed.host.toLowerCase() !== publicConfig.host) return null;

  var path = trimLeadingSlash(trimTrailingSlash(parsed.pathname));
  if (!path) return null;

  var basePath = trimLeadingSlash(trimTrailingSlash(publicConfig.path));
  if (basePath) {
    var basePathWithTrailing = trimLeadingSlash(basePath + "/");
    if (path === basePath) return null;
    if (path.startsWith(basePathWithTrailing)) {
      return path.slice(basePathWithTrailing.length);
    }
    return path;
  }

  return path;
}

function getBucketName(): string {
  return loadEnv().R2_BUCKET;
}

function getSignedUrlTtlSeconds(): number {
  var ttl = loadEnv().R2_PRESIGN_TTL_SECONDS;
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 900;
}

export function isR2ConfiguredPublicUrl(value: string): boolean {
  return getR2ObjectKeyFromUrl(value) !== null;
}

export async function resolvePublicMediaUrl(value: string | null | undefined): Promise<string | null> {
  if (typeof value !== "string") return null;
  if (value.length === 0) return null;

  var key = getR2ObjectKeyFromUrl(value);
  if (!key) {
    if (isFullUrl(value) && loadEnv().NODE_ENV === "development") {
      throw new Error(
        "[media] resolvePublicMediaUrl received a full non-R2 URL; expected R2 object key or R2 public URL"
      );
    }
    return value;
  }

  if (isPublicProfileMediaKey(key)) {
    var publicUrl = publicMediaUrlForKey(key);
    if (publicUrl) {
      // Stable public URL — no signing needed for public profile media.
      // Browser can cache this permanently across tabs with immutable Cache-Control.
      // IMPORTANT: R2 bucket must have public access enabled, or a Cloudflare Worker/CDN
      // rule that allows reads for avatar/cover profile media key prefixes.
      // If using Cloudflare R2 with a custom domain, the bucket visibility must be
      // set to "Public" in the R2 dashboard, or these URLs will return 403.
      //
      // INFRASTRUCTURE REQUIREMENT: R2 bucket must have a CORS policy allowing GET/HEAD
      // from the app origin. Set this in Cloudflare R2 dashboard -> bucket -> Settings -> CORS:
      //
      // [
      //   {
      //     "AllowedOrigins": ["https://<your-production-domain>", "http://localhost:3000"],
      //     "AllowedMethods": ["GET", "HEAD"],
      //     "AllowedHeaders": ["*"],
      //     "MaxAgeSeconds": 86400
      //   }
      // ]
      //
      // Without this, browsers will block cross-origin image loads with a CORS error
      // even though the image URL is correct and publicly accessible.
      warnIfUnexpectedMediaOutput(publicUrl, "public-profile-media");
      return publicUrl;
    }

    // R2_PUBLIC_BASE_URL not set. Fallback signs profile media, but browser cache
    // cannot persist across tabs because each API call gets new X-Amz query params.
  }

  var env = loadEnv();
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    return value;
  }

  var command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  try {
    var signedUrl = await getSignedUrl(createS3Client(), command, {
      expiresIn: getSignedUrlTtlSeconds(),
    });
    warnIfUnexpectedMediaOutput(signedUrl, "signed-media");
    return signedUrl;
  } catch (_err) {
    return value;
  }
}

export async function resolveProfileMediaUrl(
  value: string | null | undefined,
  userId: string,
  kind: "avatar" | "cover"
): Promise<string | null> {
  if (typeof value !== "string") return null;

  var key = profileMediaKeyFromStoredValue(value, userId, kind);
  if (!key) return value.trim() || null;

  var publicUrl = publicMediaUrlForKey(key);
  if (publicUrl) {
    warnIfUnexpectedMediaOutput(publicUrl, "profile-" + kind);
    return publicUrl;
  }

  // R2_PUBLIC_BASE_URL not set. Fallback signs profile media, but browser cache
  // cannot persist across tabs because each API call gets new X-Amz query params.
  var env = loadEnv();
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    return value.trim() || null;
  }

  var command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  try {
    var signedUrl = await getSignedUrl(createS3Client(), command, {
      expiresIn: getSignedUrlTtlSeconds(),
    });
    warnIfUnexpectedMediaOutput(signedUrl, "signed-profile-" + kind);
    return signedUrl;
  } catch (_err) {
    return value.trim() || null;
  }
}

export function resolveProfileAvatarUrl(
  value: string | null | undefined,
  userId: string,
  variants?: AvatarVariants | null,
  size: "sm" | "lg" = "sm"
): Promise<string | null> {
  var variant = variants?.[size];
  if (variant && variant.trim().length > 0) {
    return resolveProfileMediaUrl(variant, userId, "avatar");
  }
  return resolveProfileMediaUrl(value, userId, "avatar");
}

export function resolveProfileCoverUrl(
  value: string | null | undefined,
  userId: string,
  variants?: CoverVariants | null
): Promise<string | null> {
  var variant = variants?.default;
  if (variant && variant.trim().length > 0) {
    return resolveProfileMediaUrl(variant, userId, "cover");
  }
  return resolveProfileMediaUrl(value, userId, "cover");
}
