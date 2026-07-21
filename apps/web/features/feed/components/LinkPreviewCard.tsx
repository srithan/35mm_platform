"use client";

import Image from "next/image";
import { Icon } from "@/components/Icon/Icon";
import { cn } from "@/lib/utils/cn";
import { shouldLoadRemoteImageUnoptimized } from "@/lib/utils/remoteImageHosts";

export interface LinkPreviewCardData {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
  provider: "youtube" | "vimeo" | "link";
  presentation: "card_only" | "url_and_card";
}

interface LinkPreviewCardProps {
  preview: LinkPreviewCardData;
  density?: "feed" | "composer";
  onRemove?: () => void;
  onPresentationChange?: (presentation: LinkPreviewCardData["presentation"]) => void;
}

function PreviewContent({
  preview,
  density,
  onRemove,
}: Required<Pick<LinkPreviewCardProps, "preview" | "density">> &
  Pick<LinkPreviewCardProps, "onRemove">) {
  const compact = density === "composer";

  if (preview.image) {
    return (
      <>
        <div
          className={cn(
            "group/image relative aspect-[1.91/1] overflow-hidden rounded-xl border border-border bg-sunken shadow-sm transition-shadow duration-200 ease-out group-hover/preview:shadow-md",
            compact && "rounded-lg"
          )}
        >
          <Image
            src={preview.image}
            alt=""
            fill
            sizes={compact ? "(max-width: 768px) 92vw, 560px" : "(max-width: 768px) 92vw, 600px"}
            className="object-cover transition-transform duration-[450ms] [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover/image:scale-100"
            unoptimized={shouldLoadRemoteImageUnoptimized(preview.image)}
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.5)_16%,rgba(0,0,0,0.12)_40%,transparent_62%)]" />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 p-3.5",
              compact && "p-3"
            )}
          >
            <p
              className={cn(
                "line-clamp-2 font-semibold leading-snug tracking-[-0.01em] text-white [text-shadow:0_1px_10px_rgba(0,0,0,0.45)]",
                compact ? "text-[13px]" : "text-[15px] sm:text-base"
              )}
            >
              {preview.title}
            </p>
          </div>
          {onRemove ? (
            <button
              type="button"
              aria-label="Remove link preview"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white shadow-sm backdrop-blur-sm transition-transform duration-150 ease-out hover:bg-black active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={onRemove}
            >
              <Icon name="x" className="h-4 w-4" strokeWidth={2} />
            </button>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-1.5 px-0.5 text-fg-muted",
            compact ? "text-[11px]" : "text-[13px]"
          )}
        >
          {preview.domain}
        </p>
      </>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-sunken px-4 py-3.5 transition-colors duration-200 ease-out group-hover/preview:border-border-strong",
        onRemove && "pr-11"
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-fg-muted">
        {preview.domain}
      </p>
      <p
        className={cn(
          "mt-1.5 line-clamp-2 font-semibold leading-snug tracking-[-0.01em] text-fg",
          compact ? "text-[13px]" : "text-[15px]"
        )}
      >
        {preview.title}
      </p>
      {preview.description ? (
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">
          {preview.description}
        </p>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          aria-label="Remove link preview"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-fg-muted transition-transform duration-150 ease-out hover:bg-hover hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={onRemove}
        >
          <Icon name="x" className="h-4 w-4" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

export function LinkPreviewCard({
  preview,
  density = "feed",
  onRemove,
  onPresentationChange,
}: LinkPreviewCardProps) {
  const content = <PreviewContent preview={preview} density={density} onRemove={onRemove} />;

  if (onRemove) {
    return (
      <div className="mt-2">
        {content}
        {onPresentationChange ? (
          <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 px-0.5 text-xs text-fg-muted">
            <input
              type="checkbox"
              checked={preview.presentation === "url_and_card"}
              onChange={(event) =>
                onPresentationChange(event.target.checked ? "url_and_card" : "card_only")
              }
              className="h-3.5 w-3.5 rounded border-border-strong accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            />
            Show URL in post
          </label>
        ) : null}
      </div>
    );
  }

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${preview.title} — ${preview.domain}`}
      className="group/preview mt-2 block rounded-xl no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      onClick={(event) => event.stopPropagation()}
    >
      {content}
    </a>
  );
}
