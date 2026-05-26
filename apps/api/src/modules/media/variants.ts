import { getR2ObjectKeyFromUrl } from "./url.js";

export type PostMediaItem = {
  type: "image" | "video" | "film_embed" | "none";
  url: string;
  key?: string;
  thumbnailUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
  blurhash?: string;
  variants?: {
    thumb?: string;
    feed?: string;
    full?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  var trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value <= 0) return undefined;
  return Math.round(value);
}

function cleanType(value: unknown): PostMediaItem["type"] {
  if (value === "image" || value === "video" || value === "film_embed" || value === "none") {
    return value;
  }
  return "image";
}

export function normalizePostMediaItem(value: unknown): PostMediaItem | null {
  if (!isRecord(value)) return null;
  var url = cleanString(value.url);
  if (!url) return null;

  var variantsRaw = isRecord(value.variants) ? value.variants : null;
  var variants = variantsRaw
    ? {
        thumb: cleanString(variantsRaw.thumb) ?? undefined,
        feed: cleanString(variantsRaw.feed) ?? undefined,
        full: cleanString(variantsRaw.full) ?? undefined,
      }
    : undefined;

  var normalized: PostMediaItem = {
    type: cleanType(value.type),
    url,
  };

  var key = cleanString(value.key);
  if (key) normalized.key = key;

  var thumbnailUrl = cleanString(value.thumbnailUrl);
  if (thumbnailUrl) normalized.thumbnailUrl = thumbnailUrl;

  var altText = cleanString(value.altText);
  if (altText) normalized.altText = altText;

  var blurhash = cleanString(value.blurhash);
  if (blurhash) normalized.blurhash = blurhash;

  var width = cleanNumber(value.width);
  if (width) normalized.width = width;

  var height = cleanNumber(value.height);
  if (height) normalized.height = height;

  if (variants && (variants.thumb || variants.feed || variants.full)) {
    normalized.variants = variants;
  }

  if (!normalized.key) {
    var extractedKey = getR2ObjectKeyFromUrl(normalized.url);
    if (extractedKey) normalized.key = extractedKey;
  }

  return normalized;
}

export function normalizePostMediaList(values: unknown): PostMediaItem[] {
  if (!Array.isArray(values)) return [];
  var out: PostMediaItem[] = [];
  for (var index = 0; index < values.length; index += 1) {
    var normalized = normalizePostMediaItem(values[index]);
    if (normalized) out.push(normalized);
  }
  return out;
}

export function feedMediaUrl(item: PostMediaItem): string {
  return item.variants?.feed || item.url;
}

export function fullMediaUrl(item: PostMediaItem): string {
  return item.variants?.full || item.url;
}

export function thumbMediaUrl(item: PostMediaItem): string | null {
  return item.variants?.thumb || item.thumbnailUrl || null;
}
