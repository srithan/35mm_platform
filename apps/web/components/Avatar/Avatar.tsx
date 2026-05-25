"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  resolvePublicMediaUrl,
  shouldResolvePublicR2Url,
} from "@/lib/utils/r2Media";
import { DEFAULT_PROFILE_AVATAR_URL } from "@/lib/constants/profileMedia";

interface AvatarProps {
  initial?: string;
  src?: string | null;
  /** When false and src is empty, keep skeleton instead of showing default avatar image. */
  allowDefaultFallback?: boolean;
  size?: "sm" | "md" | "lg" | "profile-lg";
  className?: string;
  /** Extra border emphasis used in header/sidebar placements. */
  variant?: "default" | "ring";
}

const sizeMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-lg",
  "profile-lg": "w-20 h-20 text-[28px]",
};

export function Avatar({
  initial,
  src,
  allowDefaultFallback = true,
  size = "md",
  className,
  variant = "default",
}: AvatarProps) {
  const sizeClass = sizeMap[size];
  const bgClass =
    variant === "ring"
      ? "bg-sunken text-fg-light ring-1 ring-border/70"
      : "bg-border text-fg-light";
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showInitialFallback, setShowInitialFallback] = useState(false);
  const fallbackAttemptedRef = useRef(false);

  useEffect(
    function resetLoadState() {
      setImageLoaded(false);
      setShowInitialFallback(false);
      fallbackAttemptedRef.current = false;
    },
    [src]
  );

  useEffect(function () {
    let isCancelled = false;

    const trimmedSrc =
      typeof src === "string" && src.trim().length > 0 ? src.trim() : null;
    if (!trimmedSrc && !allowDefaultFallback) {
      setResolvedSrc(null);
      return;
    }

    const desiredSrc = trimmedSrc ?? DEFAULT_PROFILE_AVATAR_URL;

    if (!shouldResolvePublicR2Url(desiredSrc)) {
      setResolvedSrc(desiredSrc);
      return;
    }

    setResolvedSrc(null);
    resolvePublicMediaUrl(desiredSrc).then(function (nextSrc) {
      if (!isCancelled) {
        setResolvedSrc(nextSrc ?? DEFAULT_PROFILE_AVATAR_URL);
      }
    });

    return function () {
      isCancelled = true;
    };
  }, [src, allowDefaultFallback]);

  const showSkeleton = !resolvedSrc || (!imageLoaded && !showInitialFallback);

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold",
        sizeClass,
        bgClass,
        className
      )}
    >
      {resolvedSrc && !showInitialFallback ? (
        <Image
          src={resolvedSrc}
          alt=""
          width={size === "lg" || size === "profile-lg" ? 80 : 36}
          height={size === "lg" || size === "profile-lg" ? 80 : 36}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-150",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            if (resolvedSrc !== DEFAULT_PROFILE_AVATAR_URL && !fallbackAttemptedRef.current) {
              fallbackAttemptedRef.current = true;
              setImageLoaded(false);
              setResolvedSrc(DEFAULT_PROFILE_AVATAR_URL);
              return;
            }
            setShowInitialFallback(true);
            setImageLoaded(true);
          }}
        />
      ) : null}
      {showSkeleton ? (
        <div className="absolute inset-0 animate-pulse bg-sunken-2" aria-hidden />
      ) : null}
      {showInitialFallback ? (
        <span className="text-fg-muted">{initial || "?"}</span>
      ) : null}
    </div>
  );
}
