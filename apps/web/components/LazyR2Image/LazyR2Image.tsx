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

const DEFAULT_ROOT_MARGIN = "700px";
const LOADED_IMAGE_CACHE_TTL_MS = 45 * 60 * 1000;

type CachedImageState = {
  resolvedSrc: string;
  isLoaded: boolean;
  lastSeenAt: number;
};
const IMAGE_STATE_CACHE = new Map<string, CachedImageState>();

function getFreshImageState(value: string | null): CachedImageState | null {
  if (!value) return null;
  const cached = IMAGE_STATE_CACHE.get(value);
  if (!cached) return null;
  if (cached.lastSeenAt + LOADED_IMAGE_CACHE_TTL_MS <= Date.now()) {
    IMAGE_STATE_CACHE.delete(value);
    return null;
  }
  return cached;
}

function cacheImageState(
  value: string | null,
  nextState: Omit<CachedImageState, "lastSeenAt">
) {
  if (!value) return;
  IMAGE_STATE_CACHE.set(value, {
    ...nextState,
    lastSeenAt: Date.now(),
  });
}

function withCacheBust(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.searchParams.set("__r2_retry", Date.now().toString(36));
    return parsed.toString();
  } catch {
    const joiner = value.includes("?") ? "&" : "?";
    return value + joiner + "__r2_retry=" + Date.now().toString(36);
  }
}

function normalizeMediaSource(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed, "https://media.35mm.local");
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return `${parsed.origin}${parsed.pathname}`;
    }
    return parsed.pathname;
  } catch {
    return trimmed;
  }
}

function fallbackToCfPublicVariant(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (!parsed.hostname.endsWith("imagedelivery.net")) return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;

    const variantIndex = segments.length - 1;
    const variant = segments[variantIndex];
    if (variant !== "thumb" && variant !== "feed" && variant !== "full") return null;

    segments[variantIndex] = "public";
    parsed.pathname = "/" + segments.join("/");
    parsed.searchParams.set("__r2_retry", Date.now().toString(36));
    return parsed.toString();
  } catch {
    return null;
  }
}

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
  loading,
  decoding = "async",
  onLoad,
  onError,
  ...imgProps
}: LazyR2ImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<string | null>(null);
  const sourceIdentityRef = useRef<string | null>(null);
  const didRetryRef = useRef(false);

  const [isInView, setIsInView] = useState(forceLoad);

  const trimmedSrc = useMemo(function () {
    if (typeof src !== "string") return null;
    const value = src.trim();
    return value.length > 0 ? value : null;
  }, [src]);
  const trimmedSourceIdentity = useMemo(function () {
    return normalizeMediaSource(trimmedSrc);
  }, [trimmedSrc]);
  const sourceStateCache = getFreshImageState(trimmedSourceIdentity);

  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() =>
    sourceStateCache?.resolvedSrc ?? null
  );
  const [isLoaded, setIsLoaded] = useState(function () {
    return Boolean(sourceStateCache?.isLoaded);
  });

  const trimmedBlurhash = useMemo(function () {
    if (typeof blurhash !== "string") return null;
    const value = blurhash.trim();
    return value.length > 0 ? value : null;
  }, [blurhash]);

  useEffect(
    function resetStateOnSourceChange() {
      const previousIdentity = sourceIdentityRef.current;
      const nextIdentity = trimmedSourceIdentity;
      sourceRef.current = trimmedSrc;
      sourceIdentityRef.current = nextIdentity;

      didRetryRef.current = false;
      if (!trimmedSrc) {
        setResolvedSrc(null);
        setIsLoaded(false);
        return;
      }

      if (nextIdentity != null) {
        const cached = getFreshImageState(nextIdentity);
        if (cached) {
          sourceIdentityRef.current = nextIdentity;
          setResolvedSrc(cached.resolvedSrc);
          setIsLoaded(cached.isLoaded);
          return;
        }
      }

      if (previousIdentity != null && previousIdentity === nextIdentity) {
        return;
      }
      setResolvedSrc(null);
      setIsLoaded(false);
    },
    [trimmedSrc, trimmedSourceIdentity]
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
        const nextResolved = nextSrc ?? trimmedSrc;
        const identity = trimmedSourceIdentity;
        if (identity) {
          const currentState = getFreshImageState(identity);
          cacheImageState(identity, {
            resolvedSrc: nextResolved,
            isLoaded: Boolean(currentState?.isLoaded),
          });
        }
        setResolvedSrc(nextResolved);
      });

      return function () {
        cancelled = true;
      };
    },
    [trimmedSrc, shouldLoad, isInView, forceLoad, trimmedSourceIdentity]
  );

  const handleLoad = useCallback(
    function (event: SyntheticEvent<HTMLImageElement, Event>) {
      const identity = sourceIdentityRef.current;
      const loadedSrc = event.currentTarget.src;
      cacheImageState(identity, {
        resolvedSrc: loadedSrc,
        isLoaded: true,
      });
      setIsLoaded(true);
      onLoad?.(event);
    },
    [onLoad]
  );

  const handleError = useCallback(
    function (event: SyntheticEvent<HTMLImageElement, Event>) {
      const currentSource = sourceRef.current;
      const attemptedSource = resolvedSrc || currentSource;
      const identity = trimmedSourceIdentity;
      if (!didRetryRef.current && attemptedSource) {
        didRetryRef.current = true;
        setIsLoaded(false);

          const cfPublicVariant = fallbackToCfPublicVariant(attemptedSource);
        if (cfPublicVariant) {
          setResolvedSrc(cfPublicVariant);
          cacheImageState(identity, {
            resolvedSrc: cfPublicVariant,
            isLoaded: false,
          });
          onError?.(event);
          return;
        }

        resolvePublicMediaUrl(currentSource, { force: true }).then(function (nextSrc) {
          if (typeof nextSrc === "string" && nextSrc.trim().length > 0) {
            setResolvedSrc(withCacheBust(nextSrc));
            cacheImageState(identity, {
              resolvedSrc: withCacheBust(nextSrc),
              isLoaded: false,
            });
            return;
          }
          setResolvedSrc(withCacheBust(attemptedSource));
          cacheImageState(identity, {
            resolvedSrc: withCacheBust(attemptedSource),
            isLoaded: false,
          });
        });
      }
      onError?.(event);
    },
    [onError, resolvedSrc, trimmedSourceIdentity]
  );

  const showPlaceholder = !resolvedSrc || !isLoaded;
  const effectiveLoading = forceLoad ? "eager" : (loading ?? "lazy");

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
          loading={effectiveLoading}
          decoding={decoding}
          onLoad={handleLoad}
          onError={handleError}
          {...imgProps}
        />
      ) : null}
    </div>
  );
}
