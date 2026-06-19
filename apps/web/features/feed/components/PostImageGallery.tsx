"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  carouselDotSize,
  carouselDotStyle,
  carouselNavButtonOnDarkClass,
} from "@/lib/utils/carouselDots";
import { LazyR2Image } from "@/components/LazyR2Image";

const SINGLE_IMAGE_MAX_HEIGHT = 510;

type SingleImageLayout = "capped" | "intrinsic" | null;

function resolveSingleImageLayout(naturalWidth: number, naturalHeight: number): "capped" | "intrinsic" {
  if (naturalHeight >= SINGLE_IMAGE_MAX_HEIGHT) {
    return "capped";
  }
  return "intrinsic";
}

function gridClassName(count: number) {
  return "grid-cols-2 gap-1.5";
}

function cellClassName(count: number, index: number) {
  if (count === 2) {
    return "aspect-[4/5]";
  }
  if (count === 4) {
    return "aspect-[4/3]";
  }
  if (count === 3 && index === 0) {
    return "col-span-2 aspect-[2/1]";
  }
  if (count === 3) {
    return "aspect-square";
  }
  return "aspect-[4/3]";
}

function PostGalleryImage({
  url,
  alt,
  blurhash,
  className,
  shouldLoad = true,
  forceLoad = false,
}: {
  url: string;
  alt: string;
  blurhash?: string | null;
  className?: string;
  shouldLoad?: boolean;
  forceLoad?: boolean;
}) {
  return (
    <LazyR2Image
      src={url}
      alt={alt}
      blurhash={blurhash}
      className={className}
      containerClassName="absolute inset-0"
      rootMargin="800px"
      shouldLoad={shouldLoad}
      forceLoad={forceLoad}
      loading={forceLoad ? "eager" : "lazy"}
      draggable={false}
    />
  );
}

function SinglePostImageCell({
  url,
  blurhash,
  imageCaption,
  onImageClick,
}: {
  url: string;
  blurhash?: string | null;
  imageCaption?: string;
  onImageClick?: () => void;
}) {
  const [layout, setLayout] = useState<SingleImageLayout>(null);

  const handleLoad = useCallback(function (event: SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    if (naturalWidth <= 0 || naturalHeight <= 0) return;
    setLayout(resolveSingleImageLayout(naturalWidth, naturalHeight));
  }, []);

  const isCapped = layout === "capped";
  const isLoaded = layout !== null;

  return (
    <button
      type="button"
      className={cn(
        "relative block max-w-full overflow-hidden rounded-xl p-0 text-left",
        !isLoaded && "aspect-[16/10] w-full bg-sunken",
        isCapped && "w-fit bg-transparent",
        layout === "intrinsic" && "w-full bg-sunken"
      )}
      onClick={function (e) {
        e.stopPropagation();
        onImageClick?.();
      }}
    >
      <LazyR2Image
        src={url}
        alt={imageCaption || "Post image"}
        blurhash={blurhash}
        onLoad={handleLoad}
        className={cn(
          "rounded-xl transition-opacity hover:opacity-90",
          isCapped
            ? "block h-[510px] w-auto max-w-full"
            : "block h-auto w-full"
        )}
        containerClassName={cn(
          "relative leading-none",
          isCapped ? "block w-fit max-w-full" : "block w-full"
        )}
        placeholderClassName="rounded-xl"
        rootMargin="800px"
        loading="lazy"
        draggable={false}
      />
    </button>
  );
}

function PostImageCarousel({
  urls,
  blurhashes,
  imageCaption,
  onImageClick,
  saveData = false,
}: {
  urls: string[];
  blurhashes?: Array<string | null | undefined>;
  imageCaption?: string;
  onImageClick?: (index: number) => void;
  saveData?: boolean;
}) {
  var trackRef = useRef<HTMLDivElement>(null);
  var carouselRef = useRef<HTMLDivElement>(null);
  var [activeIndex, setActiveIndex] = useState(0);
  var [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(function () {
    var node = carouselRef.current;
    if (!node) return;

    var observer = new IntersectionObserver(
      function (entries) {
        var entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          return;
        }
        setIsNearViewport(false);
      },
      {
        rootMargin: "900px",
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return function () {
      observer.disconnect();
    };
  }, []);

  var syncActiveIndex = useCallback(function () {
    var track = trackRef.current;
    if (!track) return;
    var width = track.clientWidth;
    if (width <= 0) return;
    var nextIndex = Math.round(track.scrollLeft / width);
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= urls.length) nextIndex = urls.length - 1;
    setActiveIndex(nextIndex);
  }, [urls.length]);

  var scrollToIndex = useCallback(function (index: number) {
    var track = trackRef.current;
    if (!track) return;
    var width = track.clientWidth;
    if (width <= 0) return;
    track.scrollTo({
      left: width * index,
      behavior: "smooth",
    });
    setActiveIndex(index);
  }, []);

  return (
    <div
      ref={carouselRef}
      className="group/carousel relative mt-3.5 w-full overflow-hidden rounded-lg bg-sunken"
      onClick={function (e) {
        e.stopPropagation();
      }}
      onPointerDown={function (e) {
        e.stopPropagation();
      }}
    >
      <div
        ref={trackRef}
        onScroll={syncActiveIndex}
        className="flex w-full flex-nowrap overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Post images"
      >
        {urls.map(function (url, idx) {
          var shouldLoadImage = isNearViewport && Math.abs(idx - activeIndex) <= 1;
          if (saveData) {
            shouldLoadImage = isNearViewport && idx === activeIndex;
          }
          return (
            <button
              key={`post-image-${idx}`}
              type="button"
              aria-label={"View image " + String(idx + 1) + " of " + String(urls.length)}
              className="relative aspect-[4/5] w-full min-w-full max-w-full flex-shrink-0 flex-grow-0 snap-start snap-always bg-sunken"
              onClick={function (e) {
                e.stopPropagation();
                onImageClick?.(idx);
              }}
            >
              <PostGalleryImage
                url={url}
                alt={imageCaption || "Post image " + String(idx + 1)}
                blurhash={blurhashes?.[idx] ?? null}
                className="absolute inset-0 h-full w-full object-cover"
                shouldLoad={shouldLoadImage}
                forceLoad={shouldLoadImage}
              />
            </button>
          );
        })}
      </div>

      <div className="pointer-events-none absolute right-2.5 top-2.5 z-20 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-sm">
        {activeIndex + 1}/{urls.length}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/35 via-black/10 to-transparent px-3 pb-3 pt-10">
        <div className="flex h-3 items-center justify-center gap-[7px]" aria-hidden>
          {urls.map(function (_, idx) {
            var isActive = idx === activeIndex;
            var size = carouselDotSize(idx, activeIndex, urls.length);
            return (
              <span
                key={`post-image-dot-${idx}`}
                className={cn(
                  "rounded-full transition-[background-color,height,width] duration-200 ease-out",
                  isActive ? "bg-[#38a8f4]" : "bg-[#dedede]"
                )}
                style={carouselDotStyle(size)}
              />
            );
          })}
        </div>
      </div>

      {activeIndex > 0 ? (
        <button
          type="button"
          aria-label="Previous image"
          onClick={function (e) {
            e.stopPropagation();
            scrollToIndex(activeIndex - 1);
          }}
          className={cn(
            carouselNavButtonOnDarkClass,
            "absolute left-2 top-1/2 z-30 h-9 w-9 -translate-y-1/2"
          )}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>
      ) : null}

      {activeIndex < urls.length - 1 ? (
        <button
          type="button"
          aria-label="Next image"
          onClick={function (e) {
            e.stopPropagation();
            scrollToIndex(activeIndex + 1);
          }}
          className={cn(
            carouselNavButtonOnDarkClass,
            "absolute right-2 top-1/2 z-30 h-9 w-9 -translate-y-1/2"
          )}
        >
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}

function PostImageGrid({
  urls,
  blurhashes,
  imageCaption,
  onImageClick,
}: {
  urls: string[];
  blurhashes?: Array<string | null | undefined>;
  imageCaption?: string;
  onImageClick?: (index: number) => void;
}) {
  var count = urls.length;

  if (count === 1) {
    return (
      <div className="mt-3.5 w-full">
        <SinglePostImageCell
          url={urls[0]}
          blurhash={blurhashes?.[0] ?? null}
          imageCaption={imageCaption}
          onImageClick={function () {
            onImageClick?.(0);
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("mt-3.5 grid w-full overflow-hidden rounded-lg", gridClassName(count))}>
      {urls.map(function (url, idx) {
        return (
          <button
            key={`post-image-${idx}`}
            type="button"
            className={cn(
              "relative block w-full overflow-hidden rounded bg-sunken text-left",
              cellClassName(count, idx)
            )}
            onClick={function (e) {
              e.stopPropagation();
              onImageClick?.(idx);
            }}
          >
            <PostGalleryImage
              url={url}
              alt={imageCaption || "Post image"}
              blurhash={blurhashes?.[idx] ?? null}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity hover:opacity-90",
                count === 4 && "object-top"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function PostImageGallery({
  urls,
  blurhashes,
  imageCaption,
  onImageClick,
  saveData = false,
}: {
  urls: string[];
  blurhashes?: Array<string | null | undefined>;
  imageCaption?: string;
  onImageClick?: (index: number) => void;
  saveData?: boolean;
}) {
  if (urls.length === 0) return null;

  return (
    <>
      {urls.length >= 5 ? (
        <PostImageCarousel
          urls={urls}
          blurhashes={blurhashes}
          imageCaption={imageCaption}
          onImageClick={onImageClick}
          saveData={saveData}
        />
      ) : (
        <PostImageGrid
          urls={urls}
          blurhashes={blurhashes}
          imageCaption={imageCaption}
          onImageClick={onImageClick}
        />
      )}
      {imageCaption ? (
        <p className="mt-2 text-xs tracking-[0.02em] text-fg-muted">{imageCaption}</p>
      ) : null}
    </>
  );
}
