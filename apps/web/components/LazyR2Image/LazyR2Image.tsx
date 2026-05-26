"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";
import { decode as decodeBlurhash } from "blurhash";
import { cn } from "@/lib/utils/cn";
import { resolvePublicMediaUrl } from "@/lib/utils/r2Media";

type NativeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

interface LazyR2ImageProps extends NativeImageProps {
  src?: string | null;
  alt: string;
  blurhash?: string | null;
  containerClassName?: string;
  placeholderClassName?: string;
  rootMargin?: string;
  threshold?: number;
  shouldLoad?: boolean;
  forceLoad?: boolean;
}

const DEFAULT_ROOT_MARGIN = "200px";

function BlurhashPlaceholder({
  hash,
  className,
}: {
  hash: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(
    function renderBlurhash() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      try {
        const width = 32;
        const height = 32;
        const pixels = decodeBlurhash(hash, width, height);
        const imageData = new ImageData(Uint8ClampedArray.from(pixels), width, height);
        context.putImageData(imageData, 0, 0);
      } catch {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
    [hash]
  );

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={32}
      className={cn("absolute inset-0 h-full w-full", className)}
      aria-hidden
    />
  );
}

export function LazyR2Image({
  src,
  alt,
  blurhash,
  className,
  containerClassName,
  placeholderClassName,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0.01,
  shouldLoad = true,
  forceLoad = false,
  loading = "lazy",
  decoding = "async",
  onLoad,
  onError,
  ...imgProps
}: LazyR2ImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<string | null>(null);
  const didRetryRef = useRef(false);

  const [isInView, setIsInView] = useState(forceLoad);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const trimmedSrc = useMemo(function () {
    if (typeof src !== "string") return null;
    const value = src.trim();
    return value.length > 0 ? value : null;
  }, [src]);

  const trimmedBlurhash = useMemo(function () {
    if (typeof blurhash !== "string") return null;
    const value = blurhash.trim();
    return value.length > 0 ? value : null;
  }, [blurhash]);

  useEffect(
    function resetStateOnSourceChange() {
      sourceRef.current = trimmedSrc;
      didRetryRef.current = false;
      setResolvedSrc(null);
      setIsLoaded(false);
    },
    [trimmedSrc]
  );

  useEffect(
    function syncForceLoadState() {
      if (forceLoad) setIsInView(true);
    },
    [forceLoad]
  );

  useEffect(function observeVisibility() {
    if (forceLoad) return;
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      function (entries) {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(node);
    return function () {
      observer.disconnect();
    };
  }, [forceLoad, rootMargin, threshold]);

  useEffect(
    function resolveSource() {
      if (!trimmedSrc) return;
      if (!shouldLoad) return;
      if (!isInView && !forceLoad) return;

      let cancelled = false;
      resolvePublicMediaUrl(trimmedSrc).then(function (nextSrc) {
        if (cancelled) return;
        setResolvedSrc(nextSrc ?? trimmedSrc);
      });

      return function () {
        cancelled = true;
      };
    },
    [trimmedSrc, shouldLoad, isInView, forceLoad]
  );

  const handleLoad = useCallback(
    function (event: SyntheticEvent<HTMLImageElement, Event>) {
      setIsLoaded(true);
      onLoad?.(event);
    },
    [onLoad]
  );

  const handleError = useCallback(
    function (event: SyntheticEvent<HTMLImageElement, Event>) {
      const currentSource = sourceRef.current;
      if (!didRetryRef.current && currentSource) {
        didRetryRef.current = true;
        setIsLoaded(false);
        resolvePublicMediaUrl(currentSource, { force: true }).then(function (nextSrc) {
          if (nextSrc) setResolvedSrc(nextSrc);
        });
      }
      onError?.(event);
    },
    [onError]
  );

  const showPlaceholder = !resolvedSrc || !isLoaded;

  return (
    <div ref={containerRef} className={cn("relative", containerClassName)}>
      {showPlaceholder ? (
        trimmedBlurhash ? (
          <BlurhashPlaceholder
            hash={trimmedBlurhash}
            className={cn("scale-105 blur-[0.3px]", placeholderClassName)}
          />
        ) : (
          <div
            className={cn("absolute inset-0 animate-pulse bg-sunken-2", placeholderClassName)}
            aria-hidden
          />
        )
      ) : null}
      {resolvedSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolvedSrc}
          alt={alt}
          className={cn("transition-opacity duration-150", isLoaded ? "opacity-100" : "opacity-0", className)}
          loading={loading}
          decoding={decoding}
          onLoad={handleLoad}
          onError={handleError}
          {...imgProps}
        />
      ) : null}
    </div>
  );
}
