"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_PROFILE_AVATAR_URL } from "@/lib/constants/profileMedia";
import { isAvatarImageLoaded, markAvatarImageLoaded } from "./avatarImageCache";

interface AvatarProps {
  initial?: string;
  src?: string | null;
  /** When false and src is empty, keep skeleton instead of showing default avatar image. */
  allowDefaultFallback?: boolean;
  size?: "sm" | "md" | "lg" | "profile-lg";
  className?: string;
  loading?: "eager" | "lazy";
  /** Extra border emphasis used in header/sidebar placements. */
  variant?: "default" | "ring";
}

type AvatarLoadStatus = "loading" | "loaded" | "error";

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
  loading = "lazy",
  variant = "default",
}: AvatarProps) {
  const sizeClass = sizeMap[size];
  const bgClass =
    variant === "ring"
      ? "bg-sunken text-fg-light ring-1 ring-[color:var(--color-border)]"
      : "bg-border text-fg-light";
  const initialDisplaySrc = resolveDisplayAvatar(src, allowDefaultFallback);
  const [displaySrc, setDisplaySrc] = useState<string | null>(initialDisplaySrc);
  const [status, setStatus] = useState<AvatarLoadStatus>(function () {
    if (isAvatarImageLoaded(initialDisplaySrc)) return "loaded";
    return initialDisplaySrc || allowDefaultFallback === false ? "loading" : "error";
  });
  const fallbackAttemptedRef = useRef(false);
  const lastDisplaySrcRef = useRef(initialDisplaySrc);

  useEffect(
    function resetLoadState() {
      const nextSrc = resolveDisplayAvatar(src, allowDefaultFallback);
      if (lastDisplaySrcRef.current === nextSrc) return;
      lastDisplaySrcRef.current = nextSrc;
      setDisplaySrc(nextSrc);
      if (isAvatarImageLoaded(nextSrc)) {
        setStatus("loaded");
      } else {
        setStatus(nextSrc || allowDefaultFallback === false ? "loading" : "error");
      }
      fallbackAttemptedRef.current = false;
    },
    [src, allowDefaultFallback]
  );

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold",
        sizeClass,
        bgClass,
        className
      )}
    >
      {status === "loading" ? (
        <div
          className="absolute inset-0 rounded-full bg-sunken-2 ring-1 ring-border/60"
          aria-hidden
        />
      ) : null}
      {status === "error" ? (
        <span className="text-fg-muted">{initial || "?"}</span>
      ) : null}
      {displaySrc ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={displaySrc}
          alt=""
          aria-hidden
          loading={loading}
          decoding="async"
          onLoad={() => {
            markAvatarImageLoaded(displaySrc);
            setStatus("loaded");
          }}
          onError={() => {
            if (
              allowDefaultFallback &&
              displaySrc !== DEFAULT_PROFILE_AVATAR_URL &&
              !fallbackAttemptedRef.current
            ) {
              fallbackAttemptedRef.current = true;
              lastDisplaySrcRef.current = DEFAULT_PROFILE_AVATAR_URL;
              setDisplaySrc(DEFAULT_PROFILE_AVATAR_URL);
              setStatus("loading");
              return;
            }
            setStatus("error");
          }}
          className={cn(
            "absolute inset-0 h-full w-full rounded-full object-cover",
            status === "error" ? "opacity-0" : "opacity-100"
          )}
        />
      ) : null}
    </div>
  );
}
