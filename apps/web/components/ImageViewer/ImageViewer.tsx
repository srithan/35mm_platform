"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
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
      contentClassName="w-auto max-w-[min(96vw,72rem)] overflow-visible"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute -right-2 -top-2 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-0 sm:top-0"
        aria-label="Close"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>

      {hasMultiple ? (
        <div className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-sm">
          {activeIndex + 1}/{urls.length}
        </div>
      ) : null}

      <LazyR2Image
        key={currentUrl}
        src={currentUrl}
        blurhash={blurhashes?.[activeIndex] ?? null}
        alt={alt ? alt + " " + String(activeIndex + 1) : "Full-size image " + String(activeIndex + 1)}
        forceLoad={open}
        loading="eager"
        className="block max-h-[85vh] w-auto max-w-[min(96vw,72rem)] rounded-lg object-contain shadow-2xl"
        containerClassName="inline-flex min-h-[40vh] min-w-[min(96vw,32rem)] items-center justify-center"
        placeholderClassName="rounded-lg bg-white/10"
      />

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
              className="absolute left-0 top-1/2 z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-fg shadow-md transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
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
              className="absolute right-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white/90 text-fg shadow-md transition-colors hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 -bottom-8 flex items-center justify-center gap-1.5">
            {urls.map(function (_, idx) {
              const isActive = idx === activeIndex;
              return (
                <span
                  key={"viewer-dot-" + idx}
                  className={cn(
                    "rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out",
                    isActive ? "h-[6px] w-[18px] opacity-100" : "h-[6px] w-[6px] opacity-40"
                  )}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </Modal>
  );
}
