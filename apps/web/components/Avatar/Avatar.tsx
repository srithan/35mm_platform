"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_PROFILE_AVATAR_URL } from "@/lib/constants/profileMedia";
import { LazyR2Image } from "@/components/LazyR2Image";

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

function normalizeAvatarSource(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveDisplayAvatar(
  src?: string | null,
  allowDefaultFallback?: boolean
): string | null {
  const nextSrc = normalizeAvatarSource(src);
  if (nextSrc) return nextSrc;
  return allowDefaultFallback ? DEFAULT_PROFILE_AVATAR_URL : null;
}

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
      ? "bg-sunken text-fg-light ring-1 ring-[color:var(--color-border)]"
      : "bg-border text-fg-light";
  const initialDisplaySrc = resolveDisplayAvatar(src, allowDefaultFallback);
  const [displaySrc, setDisplaySrc] = useState<string | null>(initialDisplaySrc);
  const [showInitialFallback, setShowInitialFallback] = useState(function () {
    return initialDisplaySrc == null;
  });
  const fallbackAttemptedRef = useRef(false);
  const lastDisplaySrcRef = useRef(initialDisplaySrc);

  useEffect(
    function resetLoadState() {
      const nextSrc = resolveDisplayAvatar(src, allowDefaultFallback);
      if (lastDisplaySrcRef.current === nextSrc) return;
      lastDisplaySrcRef.current = nextSrc;
      setDisplaySrc(nextSrc);
      setShowInitialFallback(!nextSrc);
      fallbackAttemptedRef.current = false;
    },
    [src, allowDefaultFallback]
  );

  const showSkeleton = !showInitialFallback && !displaySrc;

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold",
        sizeClass,
        bgClass,
        className
      )}
    >
      {displaySrc && !showInitialFallback ? (
        <LazyR2Image
          src={displaySrc}
          alt=""
          forceLoad
          className="h-full w-full rounded-full object-cover"
          containerClassName="absolute inset-0"
          placeholderClassName="rounded-full bg-sunken-2"
          onError={() => {
            if (displaySrc !== DEFAULT_PROFILE_AVATAR_URL && !fallbackAttemptedRef.current) {
              fallbackAttemptedRef.current = true;
              setDisplaySrc(DEFAULT_PROFILE_AVATAR_URL);
              return;
            }
            setShowInitialFallback(true);
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
