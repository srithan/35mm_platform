"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { FilmCard } from "@/components/FilmCard";
import { ImageViewer } from "@/components/ImageViewer/ImageViewer";
import { ROUTES } from "@/lib/constants/routes";
import { PostImageGallery } from "../PostImageGallery";
import { VideoUrlPreview } from "../VideoUrlPreview";
import { RichPostInline } from "@/lib/utils/richPostText";
import { cn } from "@/lib/utils/cn";
import type { VideoPreview } from "../../utils/videoPreviews";
import type {
  PostCardAttachedFilm,
  PostCardFilmCard,
  PostCardLinkPreview,
  PostCardPoll,
  PostCardReplyPreview,
  PostVariant,
} from "./types";
import { PollAttachment } from "./PollAttachment";
import { LinkPreviewCard } from "../LinkPreviewCard";

interface PostCardAttachmentsProps {
  variant: PostVariant;
  filmRef?: string;
  filmCard?: PostCardFilmCard;
  attachedFilm?: PostCardAttachedFilm | null;
  hasAttachedMedia: boolean;
  combinedVideoPreviews: VideoPreview[];
  shouldRenderLinkPreviewCard: boolean;
  linkPreview?: PostCardLinkPreview | null;
  videoUrls: string[];
  imageUrls: string[];
  imageBlurhashes: Array<string | null>;
  imageDimensions?: Array<{ width: number; height: number } | null>;
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

function getFilmTitleHref(film: PostCardAttachedFilm | null | undefined): string | null {
  if (!film?.tmdbId) return null;
  return ROUTES.TITLE("movie", film.tmdbId);
}

export function PostCardAttachments({
  variant,
  filmCard,
  attachedFilm,
  hasAttachedMedia,
  combinedVideoPreviews,
  shouldRenderLinkPreviewCard,
  linkPreview,
  videoUrls,
  imageUrls,
  imageBlurhashes,
  imageDimensions = [],
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
  const filmTitleHref = getFilmTitleHref(attachedFilm);
  const filmCardNode = filmCard ? (
    <FilmCard
      title={filmCard.title}
      year={filmCard.year}
      genre={filmCard.genre}
      posterUrl={filmCard.posterUrl ?? undefined}
      rating={filmCard.rating}
    />
  ) : null;

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
          {filmTitleHref ? (
            <Link
              href={filmTitleHref}
              aria-label={`Open ${filmCard.title}`}
              className="block no-underline"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {filmCardNode}
            </Link>
          ) : (
            filmCardNode
          )}
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
            dimensions={imageDimensions}
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
        <LinkPreviewCard preview={linkPreview} />
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
