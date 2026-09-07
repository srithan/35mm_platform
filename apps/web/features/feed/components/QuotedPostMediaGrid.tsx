"use client";

import { BunnyVideoPlayer } from "@/features/videos/components/BunnyVideoPlayer";
import { FeedVideoPlayer } from "@/features/videos/components/FeedVideoPlayer";
import Image from "next/image";
import type { NsfwCategory, NsfwInfo } from "@35mm/types";
import { NsfwMediaOverlay } from "@/components/media/NsfwMediaOverlay";
import { shouldLoadRemoteImageUnoptimized } from "@/lib/utils/remoteImageHosts";
import { cn } from "@/lib/utils/cn";
import { postMediaGridCellClassName } from "./postMediaGridLayout";

export interface QuotedPostMediaGridItem {
  type: "image" | "video" | "film_embed" | "none";
  url: string;
  videoAssetId?: string;
  thumbnailUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
  nsfw?: boolean;
  nsfwCategories?: NsfwCategory[];
  variants?: {
    thumb?: string;
    feed?: string;
    full?: string;
  };
}

export function quotedMediaAspectRatio(
  item: Pick<QuotedPostMediaGridItem, "width" | "height">
): number | undefined {
  if (
    typeof item.width === "number" &&
    item.width > 0 &&
    typeof item.height === "number" &&
    item.height > 0
  ) {
    return item.width / item.height;
  }
  return undefined;
}

export function QuotedPostMediaGrid({
  media,
  nsfw = { status: "none", categories: [], source: null },
}: {
  media: QuotedPostMediaGridItem[];
  nsfw?: NsfwInfo;
}) {
  const items = media.filter(function (item) {
    return item.type === "image" || item.type === "video";
  }).slice(0, 4);

  if (items.length === 0) return null;

  const isSingleVideo = items.length === 1 && items[0].type === "video";

  return (
    <div
      className={isSingleVideo ? "block" : items.length === 1 ? "grid" : "grid grid-cols-2 gap-px bg-border"}
      aria-label="Quoted post media"
    >
      {items.map(function (item, index) {
        const status =
          nsfw.status === "pending"
            ? "pending"
            : item.nsfw
              ? "flagged"
              : "none";
        const aspectRatio = quotedMediaAspectRatio(item);
        const isLoneVideo = isSingleVideo && item.type === "video";
        const video =
          item.type === "video" && item.videoAssetId ? (
            <BunnyVideoPlayer
              assetId={item.videoAssetId}
              initialAspectRatio={aspectRatio}
            />
          ) : item.type === "video" ? (
            <FeedVideoPlayer src={item.url} initialAspectRatio={aspectRatio} />
          ) : null;
        if (isLoneVideo && video && status === "none") {
          return (
            <div
              key={`${item.url}-${index}`}
              className="relative w-full bg-sunken"
              data-nsfw-status={status}
            >
              {video}
            </div>
          );
        }
        return (
          <NsfwMediaOverlay
            key={`${item.url}-${index}`}
            status={status}
            categories={
              item.nsfwCategories && item.nsfwCategories.length > 0
                ? item.nsfwCategories
                : nsfw.categories
            }
            compact
            className={cn(
              "relative bg-sunken",
              isLoneVideo
                ? "w-full"
                : items.length === 1
                  ? "aspect-video"
                  : postMediaGridCellClassName(items.length, index)
            )}
          >
            {video ?? (
              <Image
                src={item.variants?.feed ?? item.url}
                alt={item.altText ?? ""}
                fill
                sizes={items.length === 1 ? "(max-width: 640px) 85vw, 520px" : "(max-width: 640px) 42vw, 260px"}
                className="object-cover"
                unoptimized={shouldLoadRemoteImageUnoptimized(item.variants?.feed ?? item.url)}
              />
            )}
          </NsfwMediaOverlay>
        );
      })}
    </div>
  );
}
