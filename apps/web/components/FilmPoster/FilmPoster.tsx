"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

interface FilmPosterProps {
  src?: string | null;
  imdbId?: string | null;
  alt: string;
  size?:
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "featured"
  | "review"
  | "diary"
  | "recent"
  | "favourite"
  | "list"
  | "log";
  className?: string;
  /** For placeholder when no image */
  placeholderGradient?: string;
  placeholderStrokeColor?: string;
}

const sizeMap = {
  sm: { w: 36, h: 54, class: "w-9", icon: 10 },
  md: { w: 44, h: 66, class: "w-11", icon: 12 },
  lg: { w: 72, h: 108, class: "w-[72px]", icon: 18 },
  xl: { w: 185, h: 278, class: "w-full", icon: 20 },
  featured: { w: 100, h: 140, class: "w-[100px] h-[140px]", icon: 16 },
  review: { w: 56, h: 80, class: "w-14", icon: 14 },
  diary: { w: 38, h: 57, class: "w-[38px]", icon: 12 },
  recent: { w: 60, h: 90, class: "w-[60px]", icon: 14 },
  favourite: { w: 52, h: 78, class: "w-[52px]", icon: 14 },
  list: { w: 48, h: 64, class: "w-12", icon: 12 },
  log: { w: 95, h: 142, class: "w-[95px]", icon: 18 },
};

function PlaceholderContent({
  size,
  className,
  placeholderGradient = "from-poster-bg-from to-poster-bg-to",
  strokeColor = "var(--color-poster-stroke)",
}: {
  size: keyof typeof sizeMap;
  className?: string;
  placeholderGradient?: string;
  strokeColor?: string;
}) {
  const iconSize = sizeMap[size].icon;
  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center bg-gradient-to-br",
        placeholderGradient,
        className
      )}
    >
      <svg
        width={iconSize}
        height={iconSize}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.2}
        viewBox="0 0 24 24"
      >
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    </div>
  );
}

export function FilmPoster({
  src,
  imdbId,
  alt,
  size = "md",
  className,
  placeholderGradient = "from-poster-bg-from to-poster-bg-to",
  placeholderStrokeColor = "var(--color-poster-stroke)",
}: FilmPosterProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src ?? null);
  const [hasTriedOmdb, setHasTriedOmdb] = useState(false);
  const dims = sizeMap[size];
  const aspectClass = size === "featured" ? "" : "aspect-[2/3]";
  const omdbApiKey = process.env.NEXT_PUBLIC_OMDB_API_KEY;

  const handleError = useCallback(() => {
    if (!hasTriedOmdb && imdbId && omdbApiKey) {
      setCurrentSrc(
        `https://img.omdbapi.com/?i=${imdbId}&apikey=${omdbApiKey}&h=500`
      );
      setHasTriedOmdb(true);
    } else {
      setCurrentSrc(null);
    }
  }, [hasTriedOmdb, imdbId, omdbApiKey]);

  if (!currentSrc) {
    return (
      <div
        className={cn(
          "rounded-sm overflow-hidden flex-shrink-0 flex items-center justify-center",
          aspectClass,
          size === "featured" ? "w-[100px] h-[140px]" : dims.class,
          className
        )}
      >
        <PlaceholderContent
          size={size}
          placeholderGradient={placeholderGradient}
          strokeColor={placeholderStrokeColor}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-sm overflow-hidden bg-fg flex-shrink-0",
        aspectClass,
        size === "featured" ? "w-[100px] h-[140px]" : dims.class,
        className
      )}
    >
      <Image
        src={currentSrc}
        alt={alt}
        width={dims.w}
        height={dims.h}
        unoptimized
        loading="lazy"
        className="w-full h-full object-cover"
        onError={handleError}
      />
    </div>
  );
}
