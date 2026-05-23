"use client";

import { Icon } from "@/components/Icon/Icon";

interface YouTubeEmbedProps {
  videoId: string | null;
  title?: string | null;
  onRemove: () => void;
}

export function YouTubeEmbed({ videoId, title, onRemove }: YouTubeEmbedProps) {
  if (!videoId) return null;

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <div className="rounded-[6px] overflow-hidden relative w-full">
      <div className="relative aspect-video overflow-hidden bg-fg">
        <img
          src={thumbnailUrl}
          alt="YouTube thumbnail"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
            (e.target as HTMLImageElement).style.background = "#0f0f0f";
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full flex items-center justify-center border border-white/30 bg-white/20 backdrop-blur-sm">
            <Icon name="play" className="ml-0.5 w-5 h-5 text-white" fill="currentColor" strokeWidth={0} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
          <p className="text-white text-[12px] font-medium leading-snug">
            {title ?? "YouTube video"}
          </p>
        </div>
        <span className="absolute top-2 right-2 z-10 text-[9px] font-medium tracking-widest uppercase text-white/60">
          YouTube
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        aria-label="Remove YouTube video"
      >
        <Icon name="x" className="w-2 h-2" strokeWidth={2.5} />
      </button>
    </div>
  );
}
