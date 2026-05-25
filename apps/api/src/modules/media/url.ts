import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadEnv } from "../../lib/env.js";

var s3Client: S3Client | null = null;

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

function configuredR2HostAndPath(): { host: string; path: string } {
  var baseUrl = parseConfiguredPublicBaseUrl();
  return {
    host: baseUrl ? baseUrl.host.toLowerCase() : "",
    path: baseUrl
      ? trimTrailingSlash(baseUrl.pathname.toLowerCase())
      : "",
  };
}

function extractObjectKeyFromUrl(urlString: string): string | null {
  var publicConfig = configuredR2HostAndPath();
  if (!publicConfig.host) return null;

  var parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (_err) {
    return null;
  }

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
  return extractObjectKeyFromUrl(value) !== null;
}

export async function resolvePublicMediaUrl(value: string | null | undefined): Promise<string | null> {
  if (typeof value !== "string") return null;
  if (value.length === 0) return null;

  var key = extractObjectKeyFromUrl(value);
  if (!key) {
    return value;
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
    return await getSignedUrl(createS3Client(), command, {
      expiresIn: getSignedUrlTtlSeconds(),
    });
  } catch (_err) {
    return value;
  }
}
