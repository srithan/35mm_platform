"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";
import { Blurhash } from "react-blurhash";
import { cn } from "@/lib/utils/cn";
import { resolvePublicMediaUrl } from "@/lib/utils/r2Media";

type NativeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height">;

export interface BlurImageProps extends NativeImageProps {
  src?: string | null;
  blurhash?: string | null;
  alt: string;
  width?: number | string;
  height?: number | string;
  containerClassName?: string;
  placeholderClassName?: string;
  resolveR2Url?: boolean;
}

export function BlurImage({
  src,
  blurhash,
  alt,
  width,
  height,
  className,
  containerClassName,
  placeholderClassName,
  resolveR2Url = true,
  decoding = "async",
  onLoad,
  onError,
  ...imgProps
}: BlurImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

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
    function resolveSource() {
      let cancelled = false;
      setLoaded(false);

      if (!trimmedSrc) {
        setResolvedSrc(null);
        return;
      }

      if (!resolveR2Url) {
        setResolvedSrc(trimmedSrc);
        return;
      }

      resolvePublicMediaUrl(trimmedSrc).then(function (nextSrc) {
        if (cancelled) return;
        setResolvedSrc(nextSrc ?? trimmedSrc);
      });

      return function () {
        cancelled = true;
      };
    },
    [trimmedSrc, resolveR2Url]
  );

  const handleLoad = useCallback(
    function (event: SyntheticEvent<HTMLImageElement, Event>) {
      setLoaded(true);
      onLoad?.(event);
    },
    [onLoad]
  );

  const handleError = useCallback(
    function (event: SyntheticEvent<HTMLImageElement, Event>) {
      setLoaded(false);
      onError?.(event);
    },
    [onError]
  );

  return (
    <span
      className={cn("relative block overflow-hidden bg-elevated", containerClassName)}
      style={{ width, height }}
    >
      {!loaded ? (
        trimmedBlurhash ? (
          <span className={cn("absolute inset-0 block", placeholderClassName)} aria-hidden>
            <Blurhash
              hash={trimmedBlurhash}
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
            />
          </span>
        ) : (
          <span
            className={cn("absolute inset-0 block animate-pulse bg-elevated", placeholderClassName)}
            aria-hidden
          />
        )
      ) : null}
      {resolvedSrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolvedSrc}
          alt={alt}
          width={typeof width === "number" ? width : undefined}
          height={typeof height === "number" ? height : undefined}
          className={cn(
            "transition-opacity duration-200 ease-out",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
          decoding={decoding}
          onLoad={handleLoad}
          onError={handleError}
          {...imgProps}
        />
      ) : null}
    </span>
  );
}
