export interface ResolveMediaProfile {
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
  coverUrl?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function mediaReadsPublic(): boolean {
  return (process.env.NEXT_PUBLIC_MEDIA_READS_PUBLIC || "true").toLowerCase() === "true";
}

const mediaUrlCache = new Map<string, { value: string; expiresAt: number }>();

const MEDIA_URL_CACHE_TTL_MS = 7 * 60 * 1000;

export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    // Signed R2 URLs contain X-Amz-Signature. Strip query params so legacy
    // cached profile media URLs collapse to one stable browser-cache key.
    if (parsed.searchParams.has("X-Amz-Signature") || parsed.searchParams.has("x-amz-signature")) {
      parsed.search = "";
      return parsed.toString();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function mediaCacheKey(value: string): string {
  try {
    const parsed = new URL(value);
    return parsed.pathname;
  } catch {
    return value;
  }
}

export function shouldResolvePublicR2Url(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (/\.r2\.cloudflarestorage\.com$/i.test(parsed.host)) {
      return true;
    }
    if (!/\.r2\.dev$/i.test(parsed.host)) {
      return false;
    }
    if (mediaReadsPublic()) {
      return false;
    }

    const signed =
      parsed.searchParams.get("X-Amz-Signature") ||
      parsed.searchParams.get("x-amz-signature");
    return signed === null || signed.length === 0;
  } catch {
    return false;
  }
}

export async function resolvePublicMediaUrls(
  values: string[]
): Promise<string[]> {
  if (values.length === 0) return [];

  const resolved = await Promise.all(
    values.map(function (value) {
      return resolvePublicMediaUrl(value);
    })
  );

  return resolved.filter(function (value): value is string {
    return typeof value === "string" && value.trim().length > 0;
  });
}

export async function resolvePublicMediaUrl(
  value: string | null | undefined,
  options?: { force?: boolean }
): Promise<string | null> {
  const trimmed = normalizeMediaUrl(value);
  if (!trimmed) return null;
  if (!shouldResolvePublicR2Url(trimmed)) return trimmed;

  const cacheKey = mediaCacheKey(trimmed);
  if (!options?.force) {
    const cached = mediaUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  let response: Response;
  try {
    response = await fetch(
      API_URL + "/v1/media/resolve-url?url=" + encodeURIComponent(trimmed),
      {
        cache: "no-store",
      }
    );
  } catch {
    return null;
  }
  if (!response.ok) {
    return null;
  }

  try {
    const payload = (await response.json()) as { url?: unknown };
    if (typeof payload.url === "string" && payload.url.trim().length > 0) {
      const normalizedUrl = normalizeMediaUrl(payload.url);
      if (!normalizedUrl) return null;
      mediaUrlCache.set(cacheKey, {
        value: normalizedUrl,
        expiresAt: Date.now() + MEDIA_URL_CACHE_TTL_MS,
      });
      return normalizedUrl;
    }
  } catch {
    return null;
  }

  return null;
}

export async function resolveProfileMediaUrls<T extends ResolveMediaProfile>(profile: T): Promise<T> {
  const avatarUrl = await resolvePublicMediaUrl(profile.avatarUrl);
  const avatarUrlLg = Object.prototype.hasOwnProperty.call(profile, "avatarUrlLg")
    ? await resolvePublicMediaUrl((profile as { avatarUrlLg?: string | null | undefined }).avatarUrlLg)
    : undefined;
  const coverUrl = Object.prototype.hasOwnProperty.call(profile, "coverUrl")
    ? await resolvePublicMediaUrl((profile as { coverUrl?: string | null | undefined }).coverUrl)
    : undefined;

  return {
    ...(profile as T),
    avatarUrl,
    ...(Object.prototype.hasOwnProperty.call(profile, "avatarUrlLg")
      ? {
          avatarUrlLg: avatarUrlLg ?? avatarUrl,
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(profile, "coverUrl")
      ? {
          coverUrl: coverUrl ?? null,
        }
      : {}),
  } as T;
}
