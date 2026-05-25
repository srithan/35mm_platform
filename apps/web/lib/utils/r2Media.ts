export interface ResolveMediaProfile {
  avatarUrl: string | null;
  coverUrl?: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const mediaUrlCache = new Map<string, { value: string; expiresAt: number }>();

const MEDIA_URL_CACHE_TTL_MS = 8 * 60 * 1000;

export function shouldResolvePublicR2Url(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (!/\.r2\.dev$/i.test(parsed.host) && !/\.r2\.cloudflarestorage\.com$/i.test(parsed.host)) {
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

export async function resolvePublicMediaUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!shouldResolvePublicR2Url(trimmed)) return trimmed;

  const cached = mediaUrlCache.get(trimmed);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
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
    return trimmed;
  }
  if (!response.ok) {
    return trimmed;
  }

  try {
    const payload = (await response.json()) as { url?: unknown };
    if (typeof payload.url === "string" && payload.url.trim().length > 0) {
      mediaUrlCache.set(trimmed, {
        value: payload.url,
        expiresAt: Date.now() + MEDIA_URL_CACHE_TTL_MS,
      });
      return payload.url;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export async function resolveProfileMediaUrls<T extends ResolveMediaProfile>(profile: T): Promise<T> {
  const avatarUrl = await resolvePublicMediaUrl(profile.avatarUrl);
  const coverUrl = Object.prototype.hasOwnProperty.call(profile, "coverUrl")
    ? await resolvePublicMediaUrl((profile as { coverUrl?: string | null | undefined }).coverUrl)
    : undefined;

  return {
    ...(profile as T),
    avatarUrl,
    ...(Object.prototype.hasOwnProperty.call(profile, "coverUrl")
      ? {
          coverUrl: coverUrl ?? null,
        }
      : {}),
  } as T;
}
