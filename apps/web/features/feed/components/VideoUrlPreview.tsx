"use client";

import { useState } from "react";
import type { VideoPreview } from "../utils/videoPreviews";

interface VideoUrlPreviewProps {
  preview: VideoPreview;
  onRemove?: () => void;
}

export function VideoUrlPreview({ preview, onRemove }: VideoUrlPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const isYouTube = preview.provider === "youtube";
  const isVimeo = preview.provider === "vimeo";
  const isInlinePlayable = isYouTube || isVimeo;

  if (isInlinePlayable && isPlaying) {
    const embedUrl = isYouTube
      ? `https://www.youtube-nocookie.com/embed/${preview.id}?autoplay=1&rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${preview.id}?autoplay=1&title=0&byline=0&portrait=0`;
    return (
      <div className="relative mt-3 block overflow-hidden rounded-[8px] border border-fg/10 bg-black">
        <div className="relative aspect-video">
          <iframe
            src={embedUrl}
            title={`${preview.label} video player`}
            className="absolute inset-0 h-full w-full border-0 outline-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Remove video preview"
          >
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
        ) : null}
      </div>
    );
  }

  const media = (
    <div className="relative aspect-video bg-fg overflow-hidden">
      <img
        src={preview.thumbnailUrl}
        alt={`${preview.label} video thumbnail`}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-[0_14px_28px_rgba(0,0,0,0.36),0_4px_10px_rgba(0,0,0,0.2)]">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="#0f0f0f"
            className="ml-[1px]"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
      <span
        className={`absolute top-2 text-[9px] font-medium tracking-widest uppercase text-white/75 ${
          onRemove ? "right-11" : "right-2"
        }`}
      >
        {preview.label}
      </span>
      <p className="absolute inset-x-0 bottom-0 line-clamp-2 px-3 pb-3 text-left text-[13px] font-medium leading-snug text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.55)]">
        {preview.title}
      </p>
    </div>
  );

  if (isInlinePlayable) {
    return (
      <div className="relative mt-3">
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          className="block w-full overflow-hidden rounded-[8px] border border-border transition-colors hover:border-border"
          aria-label={`Play ${preview.title}`}
        >
          {media}
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Remove video preview"
          >
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-3 rounded-[8px] overflow-hidden border border-border hover:border-border transition-colors no-underline"
      aria-label={`Open ${preview.label} video`}
    >
      {media}
    </a>
  );
}
