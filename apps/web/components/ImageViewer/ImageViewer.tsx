"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  carouselDotSize,
  carouselDotStyle,
  carouselNavButtonOnDarkClass,
} from "@/lib/utils/carouselDots";
import { Modal } from "@/components/Modal/Modal";
import { LazyR2Image } from "@/components/LazyR2Image";

interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  src?: string;
  srcs?: string[];
  blurhashes?: Array<string | null | undefined>;
  initialIndex?: number;
  alt?: string;
  /** Rendered below the image panel in its own container (e.g. post like/comment actions). */
  footer?: ReactNode;
}

function resolveUrls(src?: string, srcs?: string[]) {
  if (srcs && srcs.length > 0) return srcs;
  if (src) return [src];
  return [];
}

export function ImageViewer({
  open,
  onClose,
  src,
  srcs,
  blurhashes,
  initialIndex = 0,
  alt,
  footer,
}: ImageViewerProps) {
  const urls = resolveUrls(src, srcs);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const hasMultiple = urls.length > 1;

  useEffect(
    function () {
      if (!open) return;
      let next = initialIndex;
      if (next < 0) next = 0;
      if (next >= urls.length) next = Math.max(urls.length - 1, 0);
      setActiveIndex(next);
    },
    [open, initialIndex, urls.length]
  );

  const goPrev = useCallback(function () {
    setActiveIndex(function (prev) {
      return prev > 0 ? prev - 1 : prev;
    });
  }, []);

  const goNext = useCallback(
    function () {
      setActiveIndex(function (prev) {
        return prev < urls.length - 1 ? prev + 1 : prev;
      });
    },
    [urls.length]
  );

  useEffect(
    function () {
      if (!open || !hasMultiple) return;

      function onKeyDown(e: KeyboardEvent) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goPrev();
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          goNext();
        }
      }

      window.addEventListener("keydown", onKeyDown);
      return function () {
        window.removeEventListener("keydown", onKeyDown);
      };
    },
    [open, hasMultiple, goPrev, goNext]
  );

  const currentUrl = urls.length > 0 ? (urls[activeIndex] ?? urls[0]) : "";

  if (urls.length === 0) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="lightbox"
      animated={false}
      ariaLabel={alt || "Full-size image"}
      contentClassName="w-auto max-w-[min(96vw,72rem)] overflow-visible border-0 bg-transparent p-0 shadow-none rounded-none"
      outsidePanel={
        footer ? (
          <div
            className="image-viewer-footer w-full max-w-[min(96vw,72rem)] shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {footer}
          </div>
        ) : undefined
      }
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed right-4 top-4 z-[calc(var(--z-modal-lightbox)+1)] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-md backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-black/60 sm:right-6 sm:top-6"
        aria-label="Close"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>

      {hasMultiple ? (
        <>
          {activeIndex > 0 ? (
            <button
              type="button"
              aria-label="Previous image"
              onClick={function (e) {
                e.stopPropagation();
                goPrev();
              }}
              className={cn(
                carouselNavButtonOnDarkClass,
                "fixed left-4 top-1/2 z-[calc(var(--z-modal-lightbox)+1)] h-11 w-11 -translate-y-1/2 sm:left-6"
              )}
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
          ) : null}

          {activeIndex < urls.length - 1 ? (
            <button
              type="button"
              aria-label="Next image"
              onClick={function (e) {
                e.stopPropagation();
                goNext();
              }}
              className={cn(
                carouselNavButtonOnDarkClass,
                "fixed right-4 top-1/2 z-[calc(var(--z-modal-lightbox)+1)] h-11 w-11 -translate-y-1/2 sm:right-6"
              )}
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col items-center">
        {hasMultiple ? (
          <div className="pointer-events-none mb-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-sm">
            {activeIndex + 1}/{urls.length}
          </div>
        ) : null}

        <div className="inline-flex max-w-[min(96vw,72rem)]">
          <LazyR2Image
            key={currentUrl}
            src={currentUrl}
            blurhash={blurhashes?.[activeIndex] ?? null}
            alt={alt ? alt + " " + String(activeIndex + 1) : "Full-size image " + String(activeIndex + 1)}
            forceLoad={open}
            loading="eager"
            className="block max-h-[85vh] w-auto max-w-[min(96vw,72rem)] object-contain"
            containerClassName="inline-flex items-center justify-center"
            placeholderClassName="bg-transparent"
          />
        </div>

        {hasMultiple ? (
          <div className="pointer-events-none mt-4 flex h-3 items-center justify-center gap-[7px]">
            {urls.map(function (_, idx) {
              const isActive = idx === activeIndex;
              const size = carouselDotSize(idx, activeIndex, urls.length);
              return (
                <span
                  key={"viewer-dot-" + idx}
                  className={cn(
                    "rounded-full transition-[background-color,height,width] duration-200 ease-out",
                    isActive ? "bg-[#38a8f4]" : "bg-[#dedede]"
                  )}
                  style={carouselDotStyle(size)}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
