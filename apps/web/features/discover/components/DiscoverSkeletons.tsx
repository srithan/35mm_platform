"use client";

import { cn } from "@/lib/utils/cn";
import { BROWSE_DENSITY_VARIANT } from "@/lib/config/uiFlags";

function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block overflow-hidden rounded-sm",
        "bg-gradient-to-r from-skeleton via-skeleton-strong to-skeleton",
        "bg-skeleton-shimmer animate-skeleton-shimmer",
        className
      )}
    />
  );
}

function PosterCardSkeleton() {
  return (
    <div className="w-[116px] flex-shrink-0 text-left sm:w-[132px] lg:w-[148px]">
      <Skeleton className="mb-2 aspect-[2/3] rounded-xl" />
      <Skeleton className="h-3.5 w-[88%] rounded" />
      <Skeleton className="mt-1 h-2.5 w-1/2 rounded" />
    </div>
  );
}

export function DiscoverShelfSkeleton({
  titleWidth = "w-36",
  cardCount = 6,
  className,
}: {
  titleWidth?: string;
  cardCount?: number;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-center gap-2.5">
        <Skeleton className="h-5 w-1 rounded-full" />
        <Skeleton className={cn("h-5 rounded", titleWidth)} />
      </div>
      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6 lg:-mx-2 lg:px-2">
        <div className="flex items-start gap-3 pb-2 md:gap-4">
          {Array.from({ length: cardCount }).map(function (_, index) {
            return <PosterCardSkeleton key={index} />;
          })}
        </div>
      </div>
    </section>
  );
}

export function DiscoverHeroSkeleton() {
  const useCompactBrowseDensity = BROWSE_DENSITY_VARIANT === "compact";

  return (
    <section
      className={cn(
        "group relative w-full text-left"
      )}
      aria-hidden
    >
      <div
        className={cn(
          "relative overflow-hidden bg-sunken",
          useCompactBrowseDensity
            ? "h-[190px] sm:h-[280px] lg:h-[320px]"
            : "h-[210px] sm:h-[320px] lg:h-[360px]"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-skeleton/70 via-skeleton-strong/65 to-skeleton/80" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--bg) 0%, transparent 48%), linear-gradient(to right, var(--bg), transparent 12%, transparent 88%, var(--bg))",
          }}
        />
        <Skeleton className="absolute left-4 top-4 h-6 w-28 rounded-full bg-white/15" />
      </div>

      <div
        className={cn(
          "relative z-10 grid items-end px-4",
          useCompactBrowseDensity
            ? "-mt-12 grid-cols-[72px_minmax(0,1fr)] gap-3.5 sm:-mt-16 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5 sm:px-5 lg:-mt-20 lg:grid-cols-[136px_minmax(0,1fr)] lg:gap-6"
            : "-mt-14 grid-cols-[76px_minmax(0,1fr)] gap-4 sm:-mt-20 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-6 sm:px-6 lg:grid-cols-[156px_minmax(0,1fr)] lg:gap-8"
        )}
      >
        <Skeleton className="aspect-[2/3] self-start rounded-sm shadow-[0_12px_35px_rgba(0,0,0,0.18)]" />
        <div
          className={cn(
            "min-w-0 pb-1",
            useCompactBrowseDensity ? "pt-12 sm:pt-16 lg:pt-20" : "pt-14 sm:pt-20"
          )}
        >
          <Skeleton className="mb-3 h-3 w-40 rounded" />
          <Skeleton
            className={cn(
              "w-[84%] rounded",
              useCompactBrowseDensity ? "h-8 sm:h-10 lg:h-12 lg:w-[68%]" : "h-9 sm:h-12 lg:h-16 lg:w-[72%]"
            )}
          />
          <Skeleton className="mt-3 h-4 w-[56%] rounded" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full max-w-2xl rounded" />
            <Skeleton className="h-4 w-[74%] max-w-xl rounded" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchResultCardSkeleton() {
  return (
    <div className="text-left">
      <Skeleton className="aspect-[2/3] rounded-xl" />
      <Skeleton className="mt-2 h-3.5 w-[88%] rounded" />
      <Skeleton className="mt-1 h-2.5 w-1/2 rounded" />
    </div>
  );
}

export function DiscoverSearchResultsSkeleton() {
  return (
    <div className="py-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map(function (_, index) {
          return <SearchResultCardSkeleton key={index} />;
        })}
      </div>
    </div>
  );
}

export function DiscoverPageLoadingState() {
  return (
    <div className="min-h-full w-full bg-bg md:max-w-none md:mx-0">
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-10 pt-safe md:px-6 lg:pt-0">
        <div className="flex flex-col gap-4 border-b border-border py-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Skeleton className="h-7 w-32 rounded md:h-8 md:w-40" />
            <Skeleton className="mt-3 h-4 w-full max-w-xl rounded" />
            <Skeleton className="mt-2 h-4 w-[72%] max-w-lg rounded" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:min-w-[440px]">
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 w-full rounded-full sm:w-36" />
          </div>
        </div>

        <div className="min-w-0 pt-5">
          <DiscoverHeroSkeleton />
          <div className="mt-8">
            <DiscoverShelfSkeleton
              titleWidth="w-40"
              cardCount={7}
            />
          </div>
          <div className="mt-8">
            <DiscoverShelfSkeleton
              titleWidth="w-32"
              cardCount={7}
            />
          </div>
          <div className="mt-8">
            <DiscoverShelfSkeleton
              titleWidth="w-36"
              cardCount={7}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
