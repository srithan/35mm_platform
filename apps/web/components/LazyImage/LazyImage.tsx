"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const filmReelSvg = (
  <svg
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.2}
    viewBox="0 0 24 24"
    className="opacity-40"
  >
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

interface LazyImageProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  aspectRatio?: "2/3" | "16/9" | "3/4" | "auto";
  sizes?: string;
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  aspectRatio = "2/3",
  sizes,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const shouldUseFixedDimensions = typeof width === "number" && typeof height === "number";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsInView(true);
      },
      { rootMargin: "100px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showPlaceholder = !src || !isInView || !isLoaded || hasError;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden flex items-center justify-center bg-[var(--discover-placeholder)]",
        aspectRatio === "2/3" && "aspect-[2/3]",
        aspectRatio === "16/9" && "aspect-video",
        aspectRatio === "3/4" && "aspect-[3/4]",
        className
      )}
    >
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          {filmReelSvg}
        </div>
      )}
      {src && isInView && (
        shouldUseFixedDimensions ? (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            unoptimized
            sizes={sizes ?? `${width}px`}
            loading="lazy"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoaded && !hasError ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => {
              setIsLoaded(true);
              setHasError(false);
            }}
            onError={() => setHasError(true)}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes={sizes ?? "100vw"}
            loading="lazy"
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoaded && !hasError ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => {
              setIsLoaded(true);
              setHasError(false);
            }}
            onError={() => setHasError(true)}
          />
        )
      )}
    </div>
  );
}
