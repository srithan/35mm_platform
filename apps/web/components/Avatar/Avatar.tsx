"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  resolvePublicMediaUrl,
  shouldResolvePublicR2Url,
} from "@/lib/utils/r2Media";
import { DEFAULT_PROFILE_AVATAR_URL } from "@/lib/constants/profileMedia";

interface AvatarProps {
  initial?: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "profile-lg";
  className?: string;
  /** Gradient ring (ink → accent) like canonical sidebar avatar */
  variant?: "default" | "ring";
}

const sizeMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-lg",
  "profile-lg": "w-20 h-20 text-[28px]",
};

export function Avatar({
  src,
  size = "md",
  className,
  variant = "default",
}: AvatarProps) {
  const sizeClass = sizeMap[size];
  const bgClass =
    variant === "ring"
      ? "bg-gradient-to-br from-fg to-accent text-white"
      : "bg-border text-fg-light";
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(src && !shouldResolvePublicR2Url(src) ? src : null);

  useEffect(function () {
    let isCancelled = false;
    if (!src) {
      setResolvedSrc(null);
      return;
    }

    if (!shouldResolvePublicR2Url(src)) {
      setResolvedSrc(src);
      return;
    }

    resolvePublicMediaUrl(src).then(function (nextSrc) {
      if (!isCancelled) {
        setResolvedSrc(nextSrc);
      }
    });

    return function () {
      isCancelled = true;
    };
  }, [src]);

  const effectiveSrc = resolvedSrc ?? DEFAULT_PROFILE_AVATAR_URL;

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold",
        sizeClass,
        bgClass,
        className
      )}
    >
      <Image
        src={effectiveSrc}
        alt=""
        width={size === "lg" || size === "profile-lg" ? 80 : 36}
        height={size === "lg" || size === "profile-lg" ? 80 : 36}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
