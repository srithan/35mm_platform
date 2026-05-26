"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { LazyR2Image } from "@/components/LazyR2Image";

function gridClassName(count: number) {
  if (count === 1) return "grid-cols-1";
  return "grid-cols-2 gap-1.5";
}

function cellClassName(count: number, index: number) {
  if (count === 1) {
    return "aspect-[16/10]";
  }
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
      rootMargin="200px"
      shouldLoad={shouldLoad}
      forceLoad={forceLoad}
      loading={forceLoad ? "eager" : "lazy"}
      draggable={false}
    />
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
        rootMargin: "200px",
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
        className="flex overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Post images"
      >
        {urls.map(function (url, idx) {
          var shouldLoadImage = isNearViewport && Math.abs(idx - activeIndex) <= 1;
          if (saveData) {
            shouldLoadImage = isNearViewport && idx === activeIndex;
          }
          return (
            <button
              key={url + ":" + idx}
              type="button"
              aria-label={"View image " + String(idx + 1) + " of " + String(urls.length)}
              className="relative aspect-[4/5] min-w-full flex-shrink-0 snap-start snap-always bg-sunken"
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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="bg-gradient-to-t from-black/50 via-black/20 to-transparent px-3 pb-3 pt-10">
          <div
            className={cn(
              "flex items-center justify-center",
              urls.length > 7 ? "gap-[3px]" : "gap-1.5"
            )}
            aria-hidden
          >
            {urls.map(function (_, idx) {
              var isActive = idx === activeIndex;
              return (
                <span
                  key={"dot-" + idx}
                  className={cn(
                    "rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out",
                    urls.length > 7 ? "h-[5px]" : "h-[6px]",
                    isActive
                      ? urls.length > 7
                        ? "w-[14px] opacity-100"
                        : "w-[18px] opacity-100"
                      : urls.length > 7
                        ? "w-[5px] opacity-40"
                        : "w-[6px] opacity-40"
                  )}
                />
              );
            })}
          </div>
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
          className="absolute left-2 top-1/2 z-30 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-fg shadow-sm transition-opacity hover:bg-white md:flex md:opacity-0 md:group-hover/carousel:opacity-100"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
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
          className="absolute right-2 top-1/2 z-30 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-fg shadow-sm transition-opacity hover:bg-white md:flex md:opacity-0 md:group-hover/carousel:opacity-100"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
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

  return (
    <div className={cn("mt-3.5 grid w-full overflow-hidden rounded-lg", gridClassName(count))}>
      {urls.map(function (url, idx) {
        return (
          <button
            key={url + ":" + idx}
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
