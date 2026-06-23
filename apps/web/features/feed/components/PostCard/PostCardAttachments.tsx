"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { FilmCard } from "@/components/FilmCard";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer";
import { PostImageGallery } from "../PostImageGallery";
import { VideoUrlPreview } from "../VideoUrlPreview";
import { RichPostInline } from "@/lib/utils/richPostText";
import { shouldLoadRemoteImageUnoptimized } from "@/lib/utils/remoteImageHosts";
import { cn } from "@/lib/utils/cn";
import type { VideoPreview } from "../../utils/videoPreviews";
import type {
  PostCardFilmCard,
  PostCardLinkPreview,
  PostCardPoll,
  PostCardReplyPreview,
  PostVariant,
} from "./types";
import { PollAttachment } from "./PollAttachment";

interface PostCardAttachmentsProps {
  variant: PostVariant;
  filmRef?: string;
  filmCard?: PostCardFilmCard;
  hasAttachedMedia: boolean;
  combinedVideoPreviews: VideoPreview[];
  shouldRenderLinkPreviewCard: boolean;
  linkPreview?: PostCardLinkPreview | null;
  videoUrls: string[];
  imageUrls: string[];
  imageBlurhashes: Array<string | null>;
  prioritizeImages?: boolean;
  imageCaption?: string;
  poll?: PostCardPoll | null;
  postId?: string;
  saveData: boolean;
  normalizedViewerMediaUrls: string[];
  viewerBlurhashes: Array<string | null>;
  showImageViewer: boolean;
  viewerImageIndex: number;
  replyPreview?: PostCardReplyPreview;
  replyCount?: number;
  stopRichLinkBubble: boolean;
  onImageClick: (index: number) => void;
  onCloseImageViewer: () => void;
  imageViewerFooter?: ReactNode;
}

export function PostCardAttachments({
  variant,
  filmCard,
  hasAttachedMedia,
  combinedVideoPreviews,
  shouldRenderLinkPreviewCard,
  linkPreview,
  videoUrls,
  imageUrls,
  imageBlurhashes,
  prioritizeImages = false,
  imageCaption,
  poll,
  postId,
  saveData,
  normalizedViewerMediaUrls,
  viewerBlurhashes,
  showImageViewer,
  viewerImageIndex,
  replyPreview,
  replyCount,
  stopRichLinkBubble,
  onImageClick,
  onCloseImageViewer,
  imageViewerFooter,
}: PostCardAttachmentsProps) {
  return (
    <>
      {!hasAttachedMedia &&
        combinedVideoPreviews.map((preview) => (
          <VideoUrlPreview
            key={`${preview.provider}:${preview.id}:${preview.url}`}
            preview={preview}
          />
        ))}

      {filmCard && (
        <div className={cn("mt-2", variant === "film-log" && "mt-2")}>
          <FilmCard
            title={filmCard.title}
            year={filmCard.year}
            genre={filmCard.genre}
            posterUrl={filmCard.posterUrl ?? undefined}
            rating={filmCard.rating}
          />
        </div>
      )}

      {videoUrls[0] ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-border bg-black">
          <video src={videoUrls[0]} controls className="w-full h-auto" />
        </div>
      ) : null}

      {imageUrls.length > 0 && (
        <>
          <PostImageGallery
            urls={imageUrls}
            blurhashes={imageBlurhashes}
            priority={prioritizeImages}
            imageCaption={imageCaption}
            saveData={saveData}
            onImageClick={onImageClick}
          />
          <ImageViewer
            open={showImageViewer}
            onClose={onCloseImageViewer}
            srcs={normalizedViewerMediaUrls}
            blurhashes={viewerBlurhashes}
            initialIndex={viewerImageIndex}
            alt={imageCaption || "Post image"}
            footer={imageViewerFooter}
          />
        </>
      )}

      {poll ? <PollAttachment postId={postId} poll={poll} /> : null}

      {shouldRenderLinkPreviewCard && linkPreview ? (
        <a
          href={linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block rounded-xl border border-border bg-sunken p-3 no-underline"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-muted">
                {linkPreview.domain}
              </div>
              <div className="mt-1 text-sm font-semibold text-fg line-clamp-2">
                {linkPreview.title}
              </div>
              {linkPreview.description ? (
                <div className="mt-1 text-xs text-fg-muted line-clamp-2">
                  {linkPreview.description}
                </div>
              ) : null}
            </div>
            {linkPreview.image ? (
              <Image
                src={linkPreview.image}
                alt=""
                width={72}
                height={72}
                className="h-[72px] w-[72px] rounded-md object-cover"
                unoptimized={shouldLoadRemoteImageUnoptimized(linkPreview.image)}
              />
            ) : null}
          </div>
        </a>
      ) : null}

      {replyPreview && (
        <div className="mt-3 p-3 bg-neutral-100 rounded border-l-2 border-border">
          <div className="text-[12.5px] text-fg-light">
            <UsernameLink
              username={replyPreview.username}
              className="font-bold text-fg cursor-pointer hover:underline"
            >
              {replyPreview.username}
            </UsernameLink>{" "}
            · <span className="text-[11px]">{replyPreview.time}</span>
            <br />
            <span className="leading-relaxed block mt-1 whitespace-pre-wrap break-words">
              <RichPostInline text={replyPreview.text} stopLinkPropagation={stopRichLinkBubble} />
            </span>
          </div>
        </div>
      )}

      {replyCount !== undefined && replyCount > 0 && (
        <div
          className="text-xs text-fg-muted mt-2 cursor-pointer hover:text-fg transition-colors"
          role="button"
        >
          View {replyCount} more replies →
        </div>
      )}
    </>
  );
}
