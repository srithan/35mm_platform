import type { NsfwInfo } from "@35mm/types";
import type {
  QuotedPost,
  QuotedPostLinkPreview,
  QuotedPostMedia,
} from "@/stores/useComposerModalStore";
import type { PostCardLinkPreview, PostCardMediaItem } from "./types";
import type { ResolvedPostMedia } from "./resolvePostMedia";

function isQuotedMediaItem(
  item: PostCardMediaItem
): item is PostCardMediaItem & { type: "image" | "video" } {
  return item.type === "image" || item.type === "video";
}

export function collectQuotedMedia(
  media: PostCardMediaItem[] | undefined,
  resolved?: ResolvedPostMedia
): QuotedPostMedia[] {
  const fromMedia = Array.isArray(media)
    ? media.filter(isQuotedMediaItem).slice(0, 4)
    : [];

  if (fromMedia.length > 0) {
    return fromMedia.map(function (item) {
      const next: QuotedPostMedia = {
        type: item.type,
        url: item.url,
      };
      if (item.videoAssetId) next.videoAssetId = item.videoAssetId;
      if (item.thumbnailUrl) next.thumbnailUrl = item.thumbnailUrl;
      if (item.altText) next.altText = item.altText;
      if (typeof item.width === "number" && item.width > 0) next.width = item.width;
      if (typeof item.height === "number" && item.height > 0) next.height = item.height;
      if (item.nsfw) next.nsfw = true;
      if (item.nsfwCategories && item.nsfwCategories.length > 0) {
        next.nsfwCategories = item.nsfwCategories;
      }
      if (item.variants) next.variants = item.variants;
      return next;
    });
  }

  if (resolved?.videoAssetId) {
    return [
      {
        type: "video",
        url: resolved.videoUrls[0] ?? "",
        videoAssetId: resolved.videoAssetId,
      },
    ];
  }

  if (!resolved) return [];
  return resolved.videoUrls.slice(0, 4).map(function (url) {
    return { type: "video" as const, url };
  });
}

export function buildComposerQuotedPost(input: {
  postId: string;
  displayName: string;
  handle: string;
  avatarInitial: string;
  avatarUrl?: string | null;
  text: string;
  timestamp?: string;
  media?: PostCardMediaItem[];
  resolvedMedia?: ResolvedPostMedia;
  linkPreview?: PostCardLinkPreview | null;
  nsfw?: NsfwInfo;
}): QuotedPost {
  const linkPreview: QuotedPostLinkPreview | null = input.linkPreview
    ? {
        url: input.linkPreview.url,
        title: input.linkPreview.title,
        description: input.linkPreview.description,
        image: input.linkPreview.image,
        domain: input.linkPreview.domain,
        provider: input.linkPreview.provider,
        presentation: input.linkPreview.presentation,
      }
    : null;

  return {
    postId: input.postId,
    displayName: input.displayName,
    handle: input.handle,
    avatarInitial: input.avatarInitial,
    avatarUrl: input.avatarUrl ?? null,
    text: input.text,
    timestamp: input.timestamp,
    media: collectQuotedMedia(input.media, input.resolvedMedia),
    linkPreview,
    nsfw: input.nsfw,
  };
}
