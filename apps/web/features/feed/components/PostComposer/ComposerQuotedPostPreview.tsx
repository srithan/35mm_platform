"use client";

import type { QuotedPost } from "@/stores/useComposerModalStore";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils/cn";
import { QuotedPostMediaGrid } from "../QuotedPostMediaGrid";
import { VideoUrlPreview } from "../VideoUrlPreview";
import { videoPreviewFromLinkPreview } from "../../utils/videoPreviews";

export function ComposerQuotedPostPreview({
  quotedPost,
  className,
}: {
  quotedPost: QuotedPost;
  className?: string;
}) {
  const media = quotedPost.media ?? [];
  const linkPreviewVideo =
    media.length === 0 ? videoPreviewFromLinkPreview(quotedPost.linkPreview) : null;

  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-border-strong bg-bg", className)}
      data-testid="composer-quoted-post"
    >
      <div className="px-3.5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            initial={quotedPost.avatarInitial}
            src={quotedPost.avatarUrl}
            size="sm"
            className="h-6 w-6"
          />
          <span className="truncate text-[13px] font-bold text-fg">{quotedPost.displayName}</span>
          <span className="truncate text-[13px] text-fg-muted">{quotedPost.handle}</span>
          {quotedPost.timestamp ? (
            <span className="shrink-0 text-[13px] text-fg-muted">· {quotedPost.timestamp}</span>
          ) : null}
        </div>
        {quotedPost.text.trim() ? (
          <p className="mt-1 line-clamp-3 text-[14px] leading-relaxed text-fg">{quotedPost.text}</p>
        ) : null}
        {linkPreviewVideo ? <VideoUrlPreview preview={linkPreviewVideo} /> : null}
      </div>
      <QuotedPostMediaGrid media={media} nsfw={quotedPost.nsfw} />
    </div>
  );
}
