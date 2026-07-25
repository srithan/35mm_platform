import type { PostCardMediaItem } from "./types";
import type { NsfwCategory } from "@35mm/types";

export interface ResolvedImageNsfw {
  flagged: boolean;
  categories: NsfwCategory[];
}

export interface ResolvedPostMedia {
  normalizedMediaUrls: string[];
  normalizedViewerMediaUrls: string[];
  galleryBlurhashes: Array<string | null>;
  viewerBlurhashes: Array<string | null>;
  hasAttachedMedia: boolean;
  videoUrls: string[];
  imageUrls: string[];
  imageBlurhashes: Array<string | null>;
  imageDimensions: Array<{ width: number; height: number } | null>;
  imageNsfw: ResolvedImageNsfw[];
  viewerNsfw: ResolvedImageNsfw[];
}

function isVideoUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.includes("video");
}

export function resolvePostMedia(
  media: PostCardMediaItem[] | undefined,
  mediaUrls: string[] | undefined,
  viewerMediaUrls: string[] | undefined,
  imageSrc: string | undefined
): ResolvedPostMedia {
  const normalizedMediaUrls =
    mediaUrls && mediaUrls.length > 0 ? mediaUrls : imageSrc ? [imageSrc] : [];
  const normalizedViewerMediaUrls =
    viewerMediaUrls && viewerMediaUrls.length > 0
      ? viewerMediaUrls
      : normalizedMediaUrls;

  const imageMedia = Array.isArray(media)
    ? media.filter(function (item) {
        return item.type === "image";
      })
    : [];

  const galleryBlurhashes = normalizedMediaUrls.map(function (_url, index) {
    return imageMedia[index]?.blurhash ?? null;
  });
  const viewerBlurhashes = normalizedViewerMediaUrls.map(function (_url, index) {
    return imageMedia[index]?.blurhash ?? null;
  });
  const imageNsfw = normalizedMediaUrls.map(function (_url, index) {
    return {
      flagged: imageMedia[index]?.nsfw === true,
      categories: imageMedia[index]?.nsfwCategories ?? [],
    };
  });
  const viewerNsfw = normalizedViewerMediaUrls.map(function (_url, index) {
    return {
      flagged: imageMedia[index]?.nsfw === true,
      categories: imageMedia[index]?.nsfwCategories ?? [],
    };
  });

  const displayMediaEntries = normalizedMediaUrls.map(function (url, index) {
    const width = imageMedia[index]?.width;
    const height = imageMedia[index]?.height;
    return {
      url,
      index,
      blurhash: galleryBlurhashes[index] ?? null,
      dimensions:
        typeof width === "number" && width > 0 && typeof height === "number" && height > 0
          ? { width, height }
          : null,
    };
  });

  const videoUrls = displayMediaEntries
    .map(function (entry) {
      return entry.url;
    })
    .filter(isVideoUrl);

  const imageEntries = displayMediaEntries.filter(function (entry) {
    return !videoUrls.includes(entry.url);
  });

  return {
    normalizedMediaUrls,
    normalizedViewerMediaUrls,
    galleryBlurhashes,
    viewerBlurhashes,
    hasAttachedMedia: normalizedMediaUrls.length > 0,
    videoUrls,
    imageUrls: imageEntries.map(function (entry) {
      return entry.url;
    }),
    imageBlurhashes: imageEntries.map(function (entry) {
      return entry.blurhash;
    }),
    imageDimensions: imageEntries.map(function (entry) {
      return entry.dimensions;
    }),
    imageNsfw: imageEntries.map(function (entry) {
      return imageNsfw[entry.index] ?? { flagged: false, categories: [] };
    }),
    viewerNsfw,
  };
}
